const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegram(chatId, message) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
  });
}

async function getPrice(mint, chain) {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    const json = await res.json();
    const chainId = chain === 'Solana' ? 'solana' : chain === 'BSC' ? 'bsc' : 'ethereum';
    const pairs = json.pairs?.filter(p => p.chainId === chainId);
    if (!pairs?.length) return null;
    pairs.sort((a,b) => (b.liquidity?.usd||0) - (a.liquidity?.usd||0));
    return parseFloat(pairs[0].priceUsd || 0);
  } catch(_) { return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // POST — save sold coins to track
  if (req.method === 'POST' && req.query.action === 'save') {
    try {
      const { wallet, chain, soldCoins, telegramChatId } = req.body;

      for (const coin of soldCoins) {
        await supabase.from('pump_alerts').upsert({
          wallet_address: wallet,
          chain: chain || 'Solana',
          mint: coin.mint,
          symbol: coin.symbol,
          sell_price: coin.sellPrice,
          sell_date: coin.sellDate,
          telegram_chat_id: telegramChatId || null,
          last_checked: new Date().toISOString(),
          alerted: false
        }, { onConflict: 'wallet_address,mint' });
      }
      return res.status(200).json({ success: true });
    } catch(err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET — cron job: check for pumps
  if (req.method === 'GET') {
    try {
      // Get all unalerted sold coins
      const { data: alerts } = await supabase
        .from('pump_alerts')
        .select('*')
        .eq('alerted', false)
        .limit(100);

      if (!alerts?.length) return res.status(200).json({ checked: 0 });

      let alerted = 0;

      for (const alert of alerts) {
        const currentPrice = await getPrice(alert.mint, alert.chain);
        if (!currentPrice || !alert.sell_price) continue;

        const pumpPct = ((currentPrice - alert.sell_price) / alert.sell_price) * 100;

        // Alert if pumped 50%+ since sell
        if (pumpPct >= 50) {
          const msg = `
📈 <b>PUMP ALERT! 🚨</b>

You sold <b>${alert.symbol}</b> and it just pumped!

💸 You sold at: $${alert.sell_price.toFixed(8)}
🚀 Current price: $${currentPrice.toFixed(8)}
📈 Pump: +${pumpPct.toFixed(0)}% since you sold!

😭 Check your full history:
sol-meme-tracker.vercel.app
          `.trim();

          // Alert owner (you)
          await sendTelegram(TELEGRAM_CHAT_ID, `
🚨 <b>Pump Alert Triggered!</b>
👛 Wallet: <code>${alert.wallet_address}</code>
🪙 Coin: ${alert.symbol}
📈 Pump: +${pumpPct.toFixed(0)}%
          `.trim());

          // Alert user if they provided chat ID
          if (alert.telegram_chat_id) {
            await sendTelegram(alert.telegram_chat_id, msg);
          }

          // Mark as alerted
          await supabase.from('pump_alerts')
            .update({ alerted: true, alert_sent_at: new Date().toISOString() })
            .eq('id', alert.id);

          alerted++;
        }

        await new Promise(r => setTimeout(r, 200));
      }

      return res.status(200).json({ checked: alerts.length, alerted });
    } catch(err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
