const HELIUS_API_KEY = window.ENV_HELIUS_API_KEY || '35969944-0121-4b82-a105-e622adfe38b8';
const MORALIS_API_KEY = window.ENV_MORALIS_API_KEY || '';
const HELIUS_API = 'https://api.helius.xyz/v0';

const MAJOR_SOL = new Set([
  'So11111111111111111111111111111111111111112',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
  'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1',
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj',
]);

const MAJOR_EVM = new Set([
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  '0xdac17f958d2ee523a2206206994597c13d831ec7',
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
  '0x55d398326f99059ff775485246999027b3197955',
  '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
]);

// ── Confetti 💀 ───────────────────────────────────────────────────
function fireConfetti() {
  const emojis = ['💀', '📉', '😭', '🤦', '💸', '😱', '🩸'];
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;';
  document.body.appendChild(container);

  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    const x = Math.random() * 100;
    const delay = Math.random() * 2;
    const duration = 2 + Math.random() * 2;
    const size = 1 + Math.random() * 1.5;
    el.style.cssText = `
      position:absolute;left:${x}%;top:-50px;
      font-size:${size}rem;
      animation:confettiFall ${duration}s ${delay}s ease-in forwards;
      transform:rotate(${Math.random()*360}deg);
    `;
    container.appendChild(el);
  }

  // Add keyframes
  if (!document.getElementById('confetti-style')) {
    const style = document.createElement('style');
    style.id = 'confetti-style';
    style.textContent = `
      @keyframes confettiFall {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => container.remove(), 5000);
}

// ── Counter Animation ─────────────────────────────────────────────
function animateCounter(el, target, prefix = '', suffix = '', duration = 2000) {
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * eased;

    if (prefix === '$') {
      el.textContent = '$' + current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
      el.textContent = prefix + Math.floor(current) + suffix;
    }

    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = prefix === '$'
      ? '$' + target.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : prefix + target + suffix;
  }

  requestAnimationFrame(update);
}

// ── Telegram ──────────────────────────────────────────────────────
async function notify(type, data) {
  try {
    await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...data })
    });
  } catch(_) {}
}

// ── Leaderboard ───────────────────────────────────────────────────
async function submitLeaderboard(wallet, results, chain) {
  try {
    const totalWhatIf = results.reduce((s,r) => s + (r.analysis?.whatIfValue||0), 0);
    const topCoin = results[0]?.price?.symbol || 'N/A';
    await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet,
        whatifValue: totalWhatIf,
        coinCount: results.length,
        chain: chain || 'Solana',
        topCoin
      })
    });
  } catch(_) {}
}

async function fetchLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard');
    const json = await res.json();
    return json.data || [];
  } catch(_) { return []; }
}

// ── Pump Alerts ───────────────────────────────────────────────────
async function savePumpAlerts(wallet, results, chain) {
  try {
    const soldCoins = results
      .filter(r => !r.analysis.stillHolding && r.price?.priceUsd > 0)
      .map(r => ({
        mint: r.mint,
        symbol: r.price?.symbol || r.symbol,
        sellPrice: r.price?.priceUsd,
        sellDate: r.analysis.lastSellDate
      }));

    if (soldCoins.length === 0) return;

    await fetch('/api/pump-alerts?action=save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, chain, soldCoins })
    });
  } catch(_) {}
}

// ── Cache ─────────────────────────────────────────────────────────
async function getCached(key) {
  try {
    const res = await fetch(`/api/cache?wallet=${key}`);
    const json = await res.json();
    if (json.cached) return json.data;
  } catch(_) {}
  return null;
}

async function saveCache(key, data) {
  try {
    await fetch(`/api/cache?wallet=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch(_) {}
}

// ── Solana ────────────────────────────────────────────────────────
async function fetchSolTxs(wallet) {
  const all = [];
  let before = null;
  let page = 0;
  while (page < 3) {
    try {
      const url = `${HELIUS_API}/addresses/${wallet}/transactions?api-key=${HELIUS_API_KEY}&limit=100${before?`&before=${before}`:''}`;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) break;
      const txs = await res.json();
      if (!txs || txs.length === 0) break;
      all.push(...txs);
      before = txs[txs.length-1].signature;
      page++;
      if (txs.length < 100) break;
    } catch(e) { break; }
  }
  return all;
}

function parseSolTrades(txs, wallet) {
  const trades = {};
  for (const tx of txs) {
    if (!tx.tokenTransfers?.length) continue;
    const ts = tx.timestamp * 1000;
    for (const tf of tx.tokenTransfers) {
      const mint = tf.mint;
      if (!mint || MAJOR_SOL.has(mint)) continue;
      const amt = Math.abs(parseFloat(tf.tokenAmount)||0);
      if (amt === 0) continue;
      if (!trades[mint]) trades[mint] = { mint, symbol:tf.tokenSymbol||'UNKNOWN', name:tf.tokenName||mint.slice(0,8)+'...', buys:[], sells:[], totalBought:0, totalSold:0 };
      if (tf.toUserAccount === wallet) { trades[mint].buys.push({ts,amt}); trades[mint].totalBought+=amt; }
      else if (tf.fromUserAccount === wallet) { trades[mint].sells.push({ts,amt}); trades[mint].totalSold+=amt; }
    }
  }
  return Object.values(trades).filter(t=>t.buys.length>0);
}

// ── EVM ───────────────────────────────────────────────────────────
async function fetchEVMTxs(wallet, chainId) {
  const chainMap = { '0x1':'eth','0x38':'bsc','0x89':'polygon','0x2105':'base','0xa4b1':'arbitrum' };
  const chain = chainMap[chainId]||'eth';
  try {
    const url = `https://deep-index.moralis.io/api/v2.2/${wallet}/erc20/transfers?chain=${chain}&limit=100`;
    const res = await fetch(url, { headers: { 'X-API-Key': MORALIS_API_KEY } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.result || [];
  } catch(e) { return []; }
}

function parseEVMTrades(transfers, wallet) {
  const trades = {};
  for (const t of transfers) {
    const addr = t.address?.toLowerCase();
    if (!addr || MAJOR_EVM.has(addr)) continue;
    const dec = parseInt(t.token_decimals)||18;
    const amt = parseFloat(t.value) / Math.pow(10, dec);
    if (amt===0 || amt>1e15) continue;
    const ts = new Date(t.block_timestamp).getTime();
    if (!trades[addr]) trades[addr] = { mint:addr, symbol:t.token_symbol||'UNKNOWN', name:t.token_name||addr.slice(0,8)+'...', buys:[], sells:[], totalBought:0, totalSold:0 };
    if (t.to_address?.toLowerCase()===wallet.toLowerCase()) { trades[addr].buys.push({ts,amt}); trades[addr].totalBought+=amt; }
    else if (t.from_address?.toLowerCase()===wallet.toLowerCase()) { trades[addr].sells.push({ts,amt}); trades[addr].totalSold+=amt; }
  }
  return Object.values(trades).filter(t=>t.buys.length>0);
}

// ── Prices ────────────────────────────────────────────────────────
async function getSolPrice(mint) {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    if (!res.ok) return null;
    const json = await res.json();
    const pairs = json.pairs?.filter(p=>p.chainId==='solana');
    if (!pairs?.length) return null;
    pairs.sort((a,b)=>(b.liquidity?.usd||0)-(a.liquidity?.usd||0));
    const p = pairs[0];
    return { priceUsd:parseFloat(p.priceUsd||0), symbol:p.baseToken?.symbol||'UNKNOWN', name:p.baseToken?.name||'Unknown', pairUrl:p.url||'' };
  } catch(_) { return null; }
}

async function getEVMPrice(addr, chainId) {
  const chainMap = { '0x1':'ethereum','0x38':'bsc','0x89':'polygon','0x2105':'base','0xa4b1':'arbitrum' };
  const chain = chainMap[chainId]||'ethereum';
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addr}`);
    if (!res.ok) return null;
    const json = await res.json();
    const pairs = json.pairs?.filter(p=>p.chainId===chain);
    if (!pairs?.length) return null;
    pairs.sort((a,b)=>(b.liquidity?.usd||0)-(a.liquidity?.usd||0));
    const p = pairs[0];
    return { priceUsd:parseFloat(p.priceUsd||0), symbol:p.baseToken?.symbol||'UNKNOWN', name:p.baseToken?.name||'Unknown', pairUrl:p.url||'' };
  } catch(_) { return null; }
}

// ── Analysis ──────────────────────────────────────────────────────
function calcAnalysis(trade, price) {
  if (!trade.buys.length || !price) return null;
  const firstBuy = Math.min(...trade.buys.map(b=>b.ts));
  const lastSell = trade.sells.length ? Math.max(...trade.sells.map(s=>s.ts)) : null;
  const holdDays = lastSell ? Math.round((lastSell-firstBuy)/86400000) : Math.round((Date.now()-firstBuy)/86400000);
  const stillHolding = trade.totalBought > trade.totalSold * 1.01;
  const remaining = Math.max(0, trade.totalBought - trade.totalSold);
  return {
    firstBuyDate: new Date(firstBuy).toLocaleDateString(),
    lastSellDate: lastSell ? new Date(lastSell).toLocaleDateString() : 'Still holding',
    holdDays, stillHolding,
    remainingTokens: remaining,
    currentValue: remaining * price.priceUsd,
    whatIfValue: trade.totalBought * price.priceUsd,
    totalBought: trade.totalBought,
    totalSold: trade.totalSold,
  };
}

// ── Main ──────────────────────────────────────────────────────────
async function analyzeWallet(wallet, chain, chainId) {
  await notify('connect', { wallet, chain });

  showLoading('Checking cache...');
  const cacheKey = wallet + '_' + chain;
  const cached = await getCached(cacheKey);
  if (cached) { renderResults(cached); showToast('✓ Loaded from cache — updates every 24h'); return; }

  step(0); showLoading('Fetching your transactions...');
  let txs = [], trades = [];

  if (chain === 'Solana') {
    txs = await fetchSolTxs(wallet);
    step(1); showLoading(`Parsing ${txs.length} transactions...`);
    trades = parseSolTrades(txs, wallet);
  } else {
    txs = await fetchEVMTxs(wallet, chainId);
    step(1); showLoading(`Parsing ${txs.length} transactions...`);
    trades = parseEVMTrades(txs, wallet);
  }

  if (trades.length === 0) {
    await notify('analysis_done', { wallet, chain, txCount: txs.length, coinCount: 0 });
    document.getElementById('loading-section').classList.add('hidden');
    document.getElementById('results-section').classList.remove('hidden');
    document.getElementById('total-coins').textContent = '0';
    document.getElementById('still-holding').textContent = '0';
    document.getElementById('total-whatif').textContent = '$0.00';
    document.getElementById('coins-list').innerHTML = '<div class="no-data">😅 No meme coin trades found in your last 300 transactions.</div>';
    return;
  }

  step(2); showLoading(`Found ${trades.length} meme coins! Fetching prices...`);
  const results = [];

  for (let i = 0; i < trades.length; i++) {
    showLoading(`💰 Getting prices... (${i+1}/${trades.length})`);
    const price = chain === 'Solana' ? await getSolPrice(trades[i].mint) : await getEVMPrice(trades[i].mint, chainId);
    const analysis = calcAnalysis(trades[i], price);
    if (analysis) results.push({ ...trades[i], price, analysis });
    await sleep(150);
  }

  step(3); showLoading('Calculating your missed gains...');
  await sleep(500);

  results.sort((a,b) => (b.analysis?.whatIfValue||0) - (a.analysis?.whatIfValue||0));

  await Promise.all([
    notify('analysis_done', { wallet, chain, txCount: txs.length, coinCount: results.length }),
    submitLeaderboard(wallet, results, chain),
    savePumpAlerts(wallet, results, chain),
  ]);

  const data = { results, walletAddress: wallet, chain, chainId, fetchedAt: new Date().toISOString() };
  await saveCache(cacheKey, data);
  renderResults(data);
}

// ── Render ────────────────────────────────────────────────────────
async function renderResults(data) {
  const { results, walletAddress, chain } = data;
  document.getElementById('loading-section').classList.add('hidden');
  document.getElementById('results-section').classList.remove('hidden');

  const totalWhatIf = results.reduce((s,r) => s + (r.analysis.whatIfValue||0), 0);
  const stillHoldingCount = results.filter(r => r.analysis.stillHolding).length;

  // Animated counters
  setTimeout(() => {
    animateCounter(document.getElementById('total-coins'), results.length, '', '', 1000);
    animateCounter(document.getElementById('still-holding'), stillHoldingCount, '', '', 1200);
    animateCounter(document.getElementById('total-whatif'), totalWhatIf, '$', '', 2000);
  }, 100);

  // Fire confetti after counters
  setTimeout(() => fireConfetti(), 500);

  // Share section
  const topCoin = results[0]?.price?.symbol || 'N/A';
  const topValue = formatUSD(results[0]?.analysis?.whatIfValue||0);
  const totalStr = formatUSD(totalWhatIf);
  const tweetText = encodeURIComponent(`😱 If I held my meme coins I could have made ${totalStr}!\n\nCheck yours at MemeScope 👇`);
  const tweetUrl = encodeURIComponent('https://sol-meme-tracker.vercel.app');
  const shareUrl = `/api/share?wallet=${walletAddress}&totalWhatIf=${encodeURIComponent(totalStr)}&coinCount=${results.length}&topCoin=${topCoin}&topValue=${encodeURIComponent(topValue)}&chain=${chain}`;

  document.getElementById('share-section').innerHTML = `
    <div class="share-box">
      <div class="share-title">😱 Share your results!</div>
      <div class="share-sub">Let your friends know how much you could have made</div>
      <div class="share-buttons">
        <a href="https://twitter.com/intent/tweet?text=${tweetText}&url=${tweetUrl}" target="_blank" class="share-btn twitter-btn">𝕏 Share on Twitter</a>
        <a href="${shareUrl}" target="_blank" class="share-btn card-btn">🖼️ View Share Card</a>
      </div>
    </div>
  `;

  // Leaderboard
  const leaderboard = await fetchLeaderboard();
  renderLeaderboard(leaderboard, walletAddress);

  // Coin cards
  const container = document.getElementById('coins-list');
  container.innerHTML = '';
  if (results.length === 0) { container.innerHTML = '<div class="no-data">😅 No meme coin trades found.</div>'; return; }
  results.forEach((item,i) => {
    const card = buildCard(item);
    card.style.animationDelay = `${i*0.07}s`;
    container.appendChild(card);
  });
}

// ── Leaderboard render ────────────────────────────────────────────
function renderLeaderboard(data, currentWallet) {
  const section = document.getElementById('leaderboard-section');
  if (!section) return;

  const medals = ['🥇','🥈','🥉'];
  const userRank = data.findIndex(d => d.wallet_address === currentWallet) + 1;

  section.innerHTML = `
    <div class="leaderboard-box">
      <div class="lb-header">
        <div class="lb-title">🏆 Hall of Pain</div>
        <div class="lb-sub">Biggest missed gains — are you on here?</div>
        ${userRank > 0 ? `<div class="lb-your-rank">Your rank: #${userRank}</div>` : ''}
      </div>
      <div class="lb-list">
        ${data.slice(0,10).map((entry, i) => {
          const isYou = entry.wallet_address === currentWallet;
          const short = entry.wallet_address.slice(0,4)+'...'+entry.wallet_address.slice(-4);
          const medal = medals[i] || `#${i+1}`;
          return `
            <div class="lb-row ${isYou ? 'lb-you' : ''}">
              <div class="lb-rank">${medal}</div>
              <div class="lb-wallet">${short} ${isYou ? '<span class="you-badge">YOU</span>' : ''}</div>
              <div class="lb-chain">${entry.chain}</div>
              <div class="lb-value">${formatUSD(entry.whatif_value)}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function buildCard(item) {
  const { analysis, price } = item;
  const card = document.createElement('div');
  card.className = 'coin-card';
  const cls = analysis.whatIfValue > 1 ? 'positive' : analysis.whatIfValue > 0 ? 'neutral' : 'negative';
  const badge = analysis.stillHolding ? '<span class="badge holding">🟢 Holding</span>' : '<span class="badge sold">Sold</span>';
  card.innerHTML = `
    <div class="coin-header">
      <div class="coin-info">
        <div class="coin-symbol">${price?.symbol||item.symbol}</div>
        <div class="coin-name">${price?.name||item.name}</div>
      </div>
      ${badge}
    </div>
    <div class="coin-stats">
      <div class="stat"><div class="stat-label">First Buy</div><div class="stat-value">${analysis.firstBuyDate}</div></div>
      <div class="stat"><div class="stat-label">Held For</div><div class="stat-value">${analysis.holdDays}d</div></div>
      <div class="stat"><div class="stat-label">Total Bought</div><div class="stat-value">${fmtNum(analysis.totalBought)}</div></div>
      <div class="stat"><div class="stat-label">Price Now</div><div class="stat-value">${price?fmtPrice(price.priceUsd):'N/A'}</div></div>
    </div>
    <div class="whatif-box">
      <div class="whatif-label">If you held all tokens until today</div>
      <div class="whatif-value ${cls}">${formatUSD(analysis.whatIfValue)}</div>
      ${analysis.stillHolding?`<div class="current-value">Current value: ${formatUSD(analysis.currentValue)}</div>`:''}
    </div>
    ${price?.pairUrl?`<a href="${price.pairUrl}" target="_blank" class="dex-link">View on DexScreener →</a>`:''}
  `;
  return card;
}

// ── Helpers ───────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r=>setTimeout(r,ms)); }
function step(n) { if(window.activateLoadingStep) window.activateLoadingStep(n); }
function showLoading(msg) {
  document.getElementById('loading-section').classList.remove('hidden');
  document.getElementById('results-section').classList.add('hidden');
  document.getElementById('loading-text').textContent = msg;
}
function showToast(msg) {
  const t = document.createElement('div'); t.className='toast'; t.textContent=msg;
  document.body.appendChild(t); setTimeout(()=>t.remove(),3000);
}
function formatUSD(n) { return '$'+(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtNum(n) {
  const v=n||0;
  if(v>=1e9) return (v/1e9).toFixed(2)+'B';
  if(v>=1e6) return (v/1e6).toFixed(2)+'M';
  if(v>=1e3) return (v/1e3).toFixed(2)+'K';
  return v.toLocaleString('en-US',{maximumFractionDigits:2});
}
function fmtPrice(n) {
  if(!n) return '$0';
  if(n>=0.01) return '$'+n.toFixed(4);
  if(n>=0.000001) return '$'+n.toFixed(8);
  return '$'+n.toExponential(4);
}
