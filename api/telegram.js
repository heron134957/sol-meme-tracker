const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const HELIUS_KEY = process.env.HELIUS_API_KEY || '35969944-0121-4b82-a105-e622adfe38b8';
const MORALIS_KEY = process.env.MORALIS_API_KEY || '';
const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;
const HELIUS_API = `https://api.helius.xyz/v0`;

async function sendTelegram(message) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' })
  });
}

// ── Fetch SOL balance ─────────────────────────────────────────────
async function getSolBalance(wallet) {
  try {
    const res = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'getBalance', params:[wallet] })
    });
    const json = await res.json();
    return (json.result?.value || 0) / 1e9;
  } catch(_) { return 0; }
}

// ── Fetch SOL price ───────────────────────────────────────────────
async function getSolPrice() {
  try {
    const res = await fetch('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112');
    const json = await res.json();
    const pair = json.pairs?.find(p => p.chainId === 'solana' && p.quoteToken?.symbol === 'USDC');
    return parseFloat(pair?.priceUsd || 150);
  } catch(_) { return 150; }
}

// ── Fetch token holdings ──────────────────────────────────────────
async function getTokenHoldings(wallet) {
  try {
    const res = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getTokenAccountsByOwner',
        params: [wallet, { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
          { encoding: 'jsonParsed' }]
      })
    });
    const json = await res.json();
    return json.result?.value || [];
  } catch(_) { return []; }
}

// ── Fetch NFTs ────────────────────────────────────────────────────
async function getNFTs(wallet) {
  try {
    const res = await fetch(`${HELIUS_API}/addresses/${wallet}/nfts?api-key=${HELIUS_KEY}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json || [];
  } catch(_) { return []; }
}

// ── Fetch transaction count (30 days) ────────────────────────────
async function getRecentTxCount(wallet) {
  try {
    const url = `${HELIUS_API}/addresses/${wallet}/transactions?api-key=${HELIUS_KEY}&limit=100`;
    const res = await fetch(url);
    if (!res.ok) return 0;
    const txs = await res.json();
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return txs.filter(tx => tx.timestamp * 1000 > thirtyDaysAgo).length;
  } catch(_) { return 0; }
}

// ── Fetch wallet age (first transaction) ─────────────────────────
async function getWalletAge(wallet) {
  try {
    const res = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getSignaturesForAddress',
        params: [wallet, { limit: 1000, before: null }]
      })
    });
    const json = await res.json();
    const sigs = json.result || [];
    if (sigs.length === 0) return 0;
    const oldest = sigs[sigs.length - 1];
    const firstTs = oldest.blockTime * 1000;
    return Math.floor((Date.now() - firstTs) / (1000 * 60 * 60 * 24));
  } catch(_) { return 0; }
}

// ── Fetch meme coin holdings value ───────────────────────────────
async function getMemeHoldingsValue(tokenAccounts) {
  const MAJOR = new Set([
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
  ]);

  let totalValue = 0;
  let memeCount = 0;

  // Check top 10 token holdings for price
  const tokens = tokenAccounts
    .map(acc => ({
      mint: acc.account?.data?.parsed?.info?.mint,
      amount: parseFloat(acc.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0)
    }))
    .filter(t => t.mint && !MAJOR.has(t.mint) && t.amount > 0)
    .slice(0, 10);

  for (const token of tokens) {
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token.mint}`);
      const json = await res.json();
      const pairs = json.pairs?.filter(p => p.chainId === 'solana');
      if (!pairs?.length) continue;
      pairs.sort((a,b) => (b.liquidity?.usd||0) - (a.liquidity?.usd||0));
      const price = parseFloat(pairs[0].priceUsd || 0);
      const value = price * token.amount;
      if (value > 0.01) {
        totalValue += value;
        memeCount++;
      }
    } catch(_) {}
    await new Promise(r => setTimeout(r, 100));
  }

  return { totalValue, memeCount };
}

// ── Calculate lead score ──────────────────────────────────────────
function calcLeadScore({ solBalanceUsd, memeValue, nftCount, walletAgeDays, recentTxCount }) {
  let score = 0;
  const breakdown = [];

  // SOL Balance
  if (solBalanceUsd >= 10000) { score += 30; breakdown.push('💰 Whale balance (+30)'); }
  else if (solBalanceUsd >= 1000) { score += 22; breakdown.push('💰 Strong balance (+22)'); }
  else if (solBalanceUsd >= 100) { score += 12; breakdown.push('💰 Decent balance (+12)'); }
  else if (solBalanceUsd >= 10) { score += 5; breakdown.push('💰 Low balance (+5)'); }

  // Meme coin holdings
  if (memeValue >= 5000) { score += 25; breakdown.push('🪙 Heavy meme holder (+25)'); }
  else if (memeValue >= 500) { score += 18; breakdown.push('🪙 Active meme trader (+18)'); }
  else if (memeValue >= 50) { score += 10; breakdown.push('🪙 Some meme coins (+10)'); }
  else if (memeValue > 0) { score += 5; breakdown.push('🪙 Light meme exposure (+5)'); }

  // NFT holdings
  if (nftCount >= 10) { score += 15; breakdown.push('🖼️ NFT collector (+15)'); }
  else if (nftCount >= 3) { score += 10; breakdown.push('🖼️ Holds NFTs (+10)'); }
  else if (nftCount >= 1) { score += 5; breakdown.push('🖼️ Has NFT (+5)'); }

  // Wallet age
  if (walletAgeDays >= 730) { score += 15; breakdown.push('📅 OG wallet 2y+ (+15)'); }
  else if (walletAgeDays >= 365) { score += 10; breakdown.push('📅 1y+ wallet (+10)'); }
  else if (walletAgeDays >= 90) { score += 5; breakdown.push('📅 Active 90d+ (+5)'); }

  // Recent activity
  if (recentTxCount >= 50) { score += 15; breakdown.push('⚡ Very active trader (+15)'); }
  else if (recentTxCount >= 20) { score += 10; breakdown.push('⚡ Active trader (+10)'); }
  else if (recentTxCount >= 5) { score += 5; breakdown.push('⚡ Some activity (+5)'); }

  return { score: Math.min(score, 100), breakdown };
}

function getLeadLabel(score) {
  if (score >= 80) return '🔥 HOT LEAD — Contact immediately!';
  if (score >= 60) return '🟠 WARM LEAD — Likely to convert';
  if (score >= 40) return '🟡 COOL LEAD — Worth monitoring';
  if (score >= 20) return '🔵 COLD LEAD — Low priority';
  return '⚪ Low value — Skip for now';
}

// ── Main handler ──────────────────────────────────────────────────
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type, wallet, chain, txCount, coinCount, isPremium } = req.body;
    let message = '';

    if (type === 'connect') {
      // Run all checks in parallel
      const [solBal, solPrice, tokenAccounts, nfts, recentTxCount, walletAgeDays] = await Promise.all([
        getSolBalance(wallet),
        getSolPrice(),
        chain === 'Solana' || !chain ? getTokenHoldings(wallet) : Promise.resolve([]),
        chain === 'Solana' || !chain ? getNFTs(wallet) : Promise.resolve([]),
        getRecentTxCount(wallet),
        getWalletAge(wallet),
      ]);

      const solBalanceUsd = solBal * solPrice;
      const { totalValue: memeValue, memeCount } = await getMemeHoldingsValue(tokenAccounts);
      const nftCount = nfts.length;

      const { score, breakdown } = calcLeadScore({ solBalanceUsd, memeValue, nftCount, walletAgeDays, recentTxCount });
      const leadLabel = getLeadLabel(score);

      const scoreBar = '█'.repeat(Math.floor(score/10)) + '░'.repeat(10 - Math.floor(score/10));

      message = `
🔌 <b>New Wallet Connected!</b>

👛 <b>Wallet:</b> <code>${wallet}</code>
⛓️ <b>Chain:</b> ${chain || 'Solana'}

<b>💼 WALLET PROFILE:</b>
💰 SOL Balance: ${solBal.toFixed(3)} SOL (~$${solBalanceUsd.toFixed(2)})
🪙 Meme Holdings: $${memeValue.toFixed(2)} (${memeCount} tokens)
🖼️ NFTs: ${nftCount}
📅 Wallet Age: ${walletAgeDays} days
⚡ Activity (30d): ${recentTxCount} transactions

<b>📊 LEAD SCORE: ${score}/100</b>
[${scoreBar}]

${leadLabel}

<b>Score Breakdown:</b>
${breakdown.map(b => `  • ${b}`).join('\n')}

💎 Premium: ${isPremium ? '✅ Yes' : '❌ No'}
🕐 ${new Date().toUTCString()}
      `.trim();

    } else if (type === 'analysis_done') {
      message = `
📊 <b>Analysis Complete!</b>

👛 <b>Wallet:</b> <code>${wallet}</code>
⛓️ <b>Chain:</b> ${chain || 'Solana'}
📈 <b>Transactions:</b> ${txCount}
🪙 <b>Meme Coins Found:</b> ${coinCount}
🕐 ${new Date().toUTCString()}
      `.trim();

    } else if (type === 'paywall_hit') {
      message = `
💰 <b>Paywall Hit — Potential Customer!</b>

👛 <b>Wallet:</b> <code>${wallet}</code>
⛓️ <b>Chain:</b> ${chain || 'Solana'}
🤑 They hit the free limit and want more!
🕐 ${new Date().toUTCString()}
      `.trim();

    } else if (type === 'payment') {
      message = `
🎉 <b>NEW PAYMENT RECEIVED!</b>

👛 <b>Wallet:</b> <code>${wallet}</code>
💵 <b>Amount:</b> $4.99
⛓️ <b>Chain:</b> ${chain || 'Solana'}
🕐 ${new Date().toUTCString()}

<b>KA-CHING! 💰🎊</b>
      `.trim();
    }

    if (message) await sendTelegram(message);
    return res.status(200).json({ success: true });
  } catch(err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
