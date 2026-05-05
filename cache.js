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

  const { wallet } = req.query;

  if (!wallet) return res.status(400).json({ error: 'Wallet address required' });

  // GET - fetch cached data
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('wallet_cache')
        .select('*')
        .eq('wallet_address', wallet)
        .single();

      if (error || !data) return res.status(404).json({ cached: false });

      const age = (Date.now() - new Date(data.updated_at).getTime()) / 1000 / 60 / 60;
      if (age > 24) return res.status(404).json({ cached: false, reason: 'stale' });

      return res.status(200).json({ cached: true, data: data.data, updated_at: data.updated_at });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST - save data to cache
  if (req.method === 'POST') {
    try {
      const body = req.body;
      const { error } = await supabase
        .from('wallet_cache')
        .upsert({
          wallet_address: wallet,
          data: body,
          updated_at: new Date().toISOString()
        }, { onConflict: 'wallet_address' });

      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
