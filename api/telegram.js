const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '35969944-0121-4b82-a105-e622adfe38b8';

async function sendTelegram(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    })
  });
}

async function getSolBalance(wallet) {
  try {
    const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getBalance',
        params: [wallet]
      })
    });
    const json = await res.json();
    const lamports = json.result?.value || 0;
    return (lamports / 1e9).toFixed(4); // Convert lamports to SOL
  } catch(_) { return '?' }
}

async function getSOLPrice() {
  try {
    const res = await fetch('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112');
    const json = await res.json();
    const pair = json.pairs?.find(p => p.chainId === 'solana');
    return parseFloat(pair?.priceUsd || 0);
  } catch(_) { return 0; }
}

async function getEVMBalance(wallet) {
  try {
    const res = await fetch(`https://deep-index.moralis.io/api/v2.2/${wallet}/balance`, {
      headers: { 'X-API-Key': process.env.MORALIS_API_KEY }
    });
    const json = await res.json();
    const wei = json.balance || '0';
    return (parseFloat(wei) / 1e18).toFixed(4);
  } catch(_) { return '?'; }
}

function getPotentialLabel(balanceUsd) {
  if (balanceUsd >= 10000) return '🐋 WHALE — High priority!';
  if (balanceUsd >= 1000) return '🦈 Big fish — Likely buyer';
  if (balanceUsd >= 100) return '🐟 Medium wallet';
  if (balanceUsd >= 10) return '🐠 Small wallet';
  return '🦐 Low balance';
}

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
      // Fetch balance
      let balance = '?';
      let balanceUsd = 0;
      let balanceStr = '';

      if (chain === 'Solana' || !chain) {
        balance = await getSolBalance(wallet);
        const solPrice = await getSOLPrice();
        balanceUsd = parseFloat(balance) * solPrice;
        balanceStr = `${balance} SOL (~$${balanceUsd.toFixed(2)})`;
      } else {
        balance = await getEVMBalance(wallet);
        balanceStr = `${balance} ETH`;
        balanceUsd = parseFloat(balance) * 2500; // rough estimate
      }

      const potential = getPotentialLabel(balanceUsd);

      message = `
🔌 <b>New Wallet Connected!</b>

👛 <b>Wallet:</b> <code>${wallet}</code>
⛓️ <b>Chain:</b> ${chain || 'Solana'}
💰 <b>Balance:</b> ${balanceStr}
${potential}
💎 <b>Premium:</b> ${isPremium ? '✅ Yes' : '❌ No'}
🕐 <b>Time:</b> ${new Date().toUTCString()}
      `.trim();

    } else if (type === 'analysis_done') {
      message = `
📊 <b>Analysis Complete!</b>

👛 <b>Wallet:</b> <code>${wallet}</code>
⛓️ <b>Chain:</b> ${chain || 'Solana'}
📈 <b>Transactions:</b> ${txCount}
🪙 <b>Meme Coins Found:</b> ${coinCount}
🕐 <b>Time:</b> ${new Date().toUTCString()}
      `.trim();

    } else if (type === 'paywall_hit') {
      message = `
💰 <b>Paywall Hit — Potential Customer!</b>

👛 <b>Wallet:</b> <code>${wallet}</code>
⛓️ <b>Chain:</b> ${chain || 'Solana'}
🤑 They hit the free limit and want more!
🕐 <b>Time:</b> ${new Date().toUTCString()}
      `.trim();

    } else if (type === 'payment') {
      message = `
🎉 <b>NEW PAYMENT RECEIVED!</b>

👛 <b>Wallet:</b> <code>${wallet}</code>
💵 <b>Amount:</b> $4.99
⛓️ <b>Chain:</b> ${chain || 'Solana'}
🕐 <b>Time:</b> ${new Date().toUTCString()}

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
