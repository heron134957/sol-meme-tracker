const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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
      message = `
🔌 <b>New Wallet Connected!</b>

👛 <b>Wallet:</b> <code>${wallet}</code>
⛓️ <b>Chain:</b> ${chain || 'Solana'}
📊 <b>Transactions:</b> ${txCount || 'Fetching...'}
🪙 <b>Meme Coins:</b> ${coinCount || 'Analyzing...'}
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
💰 <b>Paywall Hit!</b>

👛 <b>Wallet:</b> <code>${wallet}</code>
⛓️ <b>Chain:</b> ${chain || 'Solana'}
🤑 <b>Potential customer!</b> They hit the free limit
🕐 <b>Time:</b> ${new Date().toUTCString()}
      `.trim();
    } else if (type === 'payment') {
      message = `
🎉 <b>NEW PAYMENT RECEIVED!</b>

👛 <b>Wallet:</b> <code>${wallet}</code>
💵 <b>Amount:</b> $4.99
⛓️ <b>Chain:</b> ${chain || 'Solana'}
🕐 <b>Time:</b> ${new Date().toUTCString()}

<b>KA-CHING! 💰</b>
      `.trim();
    }

    if (message) await sendTelegram(message);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
