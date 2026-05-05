const HELIUS_API_KEY = '35969944-0121-4b82-a105-e622adfe38b8';
const HELIUS_API = `https://api.helius.xyz/v0`;

const MAJOR_TOKENS = new Set([
  'So11111111111111111111111111111111111111112',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
  'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1',
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK (handled separately)
]);

let walletAddress = null;
let analysisData = null;

// ── Wallet Connection ──────────────────────────────────────────────
async function connectWallet() {
  try {
    if (!window.solana || !window.solana.isPhantom) {
      showError('Phantom wallet not found. Please install it from phantom.app');
      return;
    }
    const response = await window.solana.connect();
    walletAddress = response.publicKey.toString();
    onWalletConnected();
  } catch (err) {
    showError('Wallet connection cancelled.');
  }
}

async function connectSolflare() {
  try {
    if (!window.solflare) {
      showError('Solflare wallet not found. Please install it from solflare.com');
      return;
    }
    await window.solflare.connect();
    walletAddress = window.solflare.publicKey.toString();
    onWalletConnected();
  } catch (err) {
    showError('Wallet connection cancelled.');
  }
}

function onWalletConnected() {
  document.getElementById('connect-section').classList.add('hidden');
  document.getElementById('app-section').classList.remove('hidden');
  document.getElementById('wallet-address').textContent =
    walletAddress.slice(0, 4) + '...' + walletAddress.slice(-4);
  analyzeWallet();
}

// ── Cache Layer ────────────────────────────────────────────────────
async function getCached(wallet) {
  try {
    const res = await fetch(`/api/cache?wallet=${wallet}`);
    const json = await res.json();
    if (json.cached) return json.data;
  } catch (_) {}
  return null;
}

async function saveCache(wallet, data) {
  try {
    await fetch(`/api/cache?wallet=${wallet}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (_) {}
}

// ── Fetch Transactions via Helius ─────────────────────────────────
async function fetchTransactions(wallet) {
  const allTxs = [];
  let before = null;
  let page = 0;

  while (page < 3) {
    try {
      // No type filter — get ALL transactions then parse locally
      const url = `${HELIUS_API}/addresses/${wallet}/transactions?api-key=${HELIUS_API_KEY}&limit=100${before ? `&before=${before}` : ''}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) break;
      const txs = await res.json();
      if (!txs || txs.length === 0) break;
      allTxs.push(...txs);
      before = txs[txs.length - 1].signature;
      page++;
      if (txs.length < 100) break;
    } catch (e) {
      console.error('Fetch error:', e);
      break;
    }
  }
  return allTxs;
}

// ── Parse Meme Coin Trades ────────────────────────────────────────
function parseTrades(transactions, wallet) {
  const trades = {};

  for (const tx of transactions) {
    // Accept SWAP, UNKNOWN, and any tx with token transfers
    if (!tx.tokenTransfers || tx.tokenTransfers.length === 0) continue;

    const timestamp = tx.timestamp * 1000;

    for (const transfer of tx.tokenTransfers) {
      const mint = transfer.mint;
      if (!mint || MAJOR_TOKENS.has(mint)) continue;

      // Skip NFTs (amount is usually 1 for NFTs)
      const amount = Math.abs(parseFloat(transfer.tokenAmount) || 0);
      if (amount === 0) continue;

      if (!trades[mint]) {
        trades[mint] = {
          mint,
          symbol: transfer.tokenSymbol || 'UNKNOWN',
          name: transfer.tokenName || mint.slice(0, 8) + '...',
          buys: [],
          sells: [],
          totalBought: 0,
          totalSold: 0,
        };
      }

      const toWallet = transfer.toUserAccount === wallet;
      const fromWallet = transfer.fromUserAccount === wallet;

      if (toWallet) {
        trades[mint].buys.push({ timestamp, amount, tx: tx.signature });
        trades[mint].totalBought += amount;
      } else if (fromWallet) {
        trades[mint].sells.push({ timestamp, amount, tx: tx.signature });
        trades[mint].totalSold += amount;
      }
    }
  }

  // Only return coins where we have buys
  return Object.values(trades).filter(t => t.buys.length > 0);
}

// ── Fetch Price via DexScreener ───────────────────────────────────
async function fetchTokenPrice(mint) {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    if (!res.ok) return null;
    const json = await res.json();
    const pairs = json.pairs?.filter(p => p.chainId === 'solana');
    if (!pairs || pairs.length === 0) return null;
    pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
    const pair = pairs[0];
    return {
      priceUsd: parseFloat(pair.priceUsd || 0),
      priceChange24h: pair.priceChange?.h24 || 0,
      volume24h: pair.volume?.h24 || 0,
      liquidity: pair.liquidity?.usd || 0,
      marketCap: pair.marketCap || 0,
      symbol: pair.baseToken?.symbol || 'UNKNOWN',
      name: pair.baseToken?.name || 'Unknown',
      pairUrl: pair.url || '',
    };
  } catch (_) {
    return null;
  }
}

// ── Calculate Hold Analysis ───────────────────────────────────────
function calculateHoldAnalysis(trade, currentPrice) {
  if (!trade.buys.length || !currentPrice) return null;

  const firstBuy = Math.min(...trade.buys.map(b => b.timestamp));
  const lastSell = trade.sells.length
    ? Math.max(...trade.sells.map(s => s.timestamp))
    : null;

  const holdDays = lastSell
    ? Math.round((lastSell - firstBuy) / 86400000)
    : Math.round((Date.now() - firstBuy) / 86400000);

  const stillHolding = trade.totalBought > trade.totalSold * 1.01;
  const remainingTokens = Math.max(0, trade.totalBought - trade.totalSold);
  const currentValue = remainingTokens * currentPrice.priceUsd;
  const whatIfValue = trade.totalBought * currentPrice.priceUsd;

  return {
    firstBuyDate: new Date(firstBuy).toLocaleDateString(),
    lastSellDate: lastSell ? new Date(lastSell).toLocaleDateString() : 'Still holding',
    holdDays,
    stillHolding,
    remainingTokens,
    currentValue,
    whatIfValue,
    totalBought: trade.totalBought,
    totalSold: trade.totalSold,
  };
}

// ── Main Analysis ─────────────────────────────────────────────────
async function analyzeWallet() {
  showLoading('Checking cache...');

  const cached = await getCached(walletAddress);
  if (cached) {
    analysisData = cached;
    renderResults(analysisData);
    showToast('Loaded from cache (updates every 24h)');
    return;
  }

  showLoading('Fetching your transactions...');
  const transactions = await fetchTransactions(walletAddress);

  showLoading(`Parsing ${transactions.length} transactions...`);
  const trades = parseTrades(transactions, walletAddress);

  if (trades.length === 0) {
    showLoading('No meme coin trades found...');
    setTimeout(() => {
      document.getElementById('loading-section').classList.add('hidden');
      document.getElementById('results-section').classList.remove('hidden');
      document.getElementById('total-coins').textContent = '0';
      document.getElementById('still-holding').textContent = '0';
      document.getElementById('total-whatif').textContent = '$0.00';
      document.getElementById('coins-list').innerHTML =
        '<div class="no-data">No meme coin trades found in your last 300 transactions.</div>';
    }, 1500);
    return;
  }

  showLoading(`Found ${trades.length} meme coins! Fetching prices...`);
  const results = [];

  for (let i = 0; i < trades.length; i++) {
    const trade = trades[i];
    showLoading(`Fetching prices... (${i + 1}/${trades.length})`);
    const price = await fetchTokenPrice(trade.mint);
    const analysis = calculateHoldAnalysis(trade, price);
    if (analysis) {
      results.push({ ...trade, price, analysis });
    }
    await sleep(150);
  }

  results.sort((a, b) => (b.analysis?.whatIfValue || 0) - (a.analysis?.whatIfValue || 0));

  analysisData = { results, walletAddress, fetchedAt: new Date().toISOString() };
  await saveCache(walletAddress, analysisData);
  renderResults(analysisData);
}

// ── Render Results ────────────────────────────────────────────────
function renderResults(data) {
  const { results } = data;
  document.getElementById('loading-section').classList.add('hidden');
  document.getElementById('results-section').classList.remove('hidden');

  document.getElementById('total-coins').textContent = results.length;
  const stillHolding = results.filter(r => r.analysis.stillHolding).length;
  document.getElementById('still-holding').textContent = stillHolding;
  const totalWhatIf = results.reduce((sum, r) => sum + (r.analysis.whatIfValue || 0), 0);
  document.getElementById('total-whatif').textContent = formatUSD(totalWhatIf);

  const container = document.getElementById('coins-list');
  container.innerHTML = '';

  if (results.length === 0) {
    container.innerHTML = '<div class="no-data">No meme coin trades found in this wallet.</div>';
    return;
  }

  for (const item of results) {
    container.appendChild(buildCoinCard(item));
  }
}

function buildCoinCard(item) {
  const { analysis, price } = item;
  const card = document.createElement('div');
  card.className = 'coin-card';

  const whatIfClass = analysis.whatIfValue > 0 ? 'positive' : 'negative';
  const statusBadge = analysis.stillHolding
    ? '<span class="badge holding">Holding</span>'
    : '<span class="badge sold">Sold</span>';

  card.innerHTML = `
    <div class="coin-header">
      <div class="coin-info">
        <div class="coin-symbol">${price?.symbol || item.symbol}</div>
        <div class="coin-name">${price?.name || item.name}</div>
      </div>
      <div class="coin-badges">${statusBadge}</div>
    </div>
    <div class="coin-stats">
      <div class="stat">
        <div class="stat-label">First Buy</div>
        <div class="stat-value">${analysis.firstBuyDate}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Held For</div>
        <div class="stat-value">${analysis.holdDays} days</div>
      </div>
      <div class="stat">
        <div class="stat-label">Total Bought</div>
        <div class="stat-value">${formatNumber(analysis.totalBought)}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Current Price</div>
        <div class="stat-value">${price ? formatPrice(price.priceUsd) : 'N/A'}</div>
      </div>
    </div>
    <div class="whatif-box">
      <div class="whatif-label">💎 If you held all tokens until now</div>
      <div class="whatif-value ${whatIfClass}">${formatUSD(analysis.whatIfValue)}</div>
      ${analysis.stillHolding ? `<div class="current-value">Current holdings: ${formatUSD(analysis.currentValue)}</div>` : ''}
    </div>
    ${price?.pairUrl ? `<a href="${price.pairUrl}" target="_blank" class="dex-link">View on DexScreener →</a>` : ''}
  `;
  return card;
}

// ── Helpers ───────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function formatUSD(n) { return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatNumber(n) { return (n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
function formatPrice(n) {
  if (!n) return '$0';
  if (n >= 0.01) return '$' + n.toFixed(4);
  if (n >= 0.000001) return '$' + n.toFixed(8);
  return '$' + n.toExponential(4);
}

function showLoading(msg) {
  document.getElementById('loading-section').classList.remove('hidden');
  document.getElementById('results-section').classList.add('hidden');
  document.getElementById('loading-text').textContent = msg;
}

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function disconnectWallet() {
  walletAddress = null;
  analysisData = null;
  document.getElementById('connect-section').classList.remove('hidden');
  document.getElementById('app-section').classList.add('hidden');
  document.getElementById('results-section').classList.add('hidden');
}

window.connectWallet = connectWallet;
window.connectSolflare = connectSolflare;
window.disconnectWallet = disconnectWallet;
