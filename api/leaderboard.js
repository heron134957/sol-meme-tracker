const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — fetch top 50 leaderboard
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('whatif_value', { ascending: false })
        .limit(50);
      if (error) throw error;
      return res.status(200).json({ data: data || [] });
    } catch(err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST — upsert wallet stats
  if (req.method === 'POST') {
    try {
      const { wallet, whatifValue, coinCount, chain, topCoin } = req.body;
      if (!wallet || !whatifValue) return res.status(400).json({ error: 'Missing fields' });

      const { error } = await supabase
        .from('leaderboard')
        .upsert({
          wallet_address: wallet,
          whatif_value: whatifValue,
          coin_count: coinCount || 0,
          chain: chain || 'Solana',
          top_coin: topCoin || 'N/A',
          updated_at: new Date().toISOString()
        }, { onConflict: 'wallet_address' });

      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch(err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
