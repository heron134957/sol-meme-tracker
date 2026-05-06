module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { wallet, totalWhatIf, coinCount, topCoin, topValue, chain } = req.query;

  const short = wallet ? wallet.slice(0,4)+'...'+wallet.slice(-4) : '???';
  const chainEmoji = chain === 'Ethereum' ? '⟠' : chain === 'BSC' ? '🟡' : '◎';

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700;12..96,800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{
    width:1200px;height:630px;
    background:#04060d;
    font-family:'Bricolage Grotesque',sans-serif;
    display:flex;align-items:center;justify-content:center;
    overflow:hidden;position:relative;
  }
  .bg{
    position:absolute;inset:0;
    background:
      radial-gradient(ellipse 100% 80% at 50% -20%, rgba(79,122,255,0.25) 0%, transparent 60%),
      radial-gradient(ellipse 60% 60% at 90% 100%, rgba(139,92,246,0.15) 0%, transparent 60%);
  }
  .grid{
    position:absolute;inset:0;
    background-image:linear-gradient(rgba(79,122,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(79,122,255,0.05) 1px,transparent 1px);
    background-size:60px 60px;
  }
  .card{
    position:relative;z-index:1;
    width:1100px;
    background:rgba(8,14,28,0.9);
    border:1px solid rgba(79,122,255,0.3);
    border-radius:32px;
    padding:60px;
    display:flex;flex-direction:column;gap:40px;
  }
  .top{display:flex;align-items:center;justify-content:space-between;}
  .logo{display:flex;align-items:center;gap:14px;}
  .logo-icon{
    width:48px;height:48px;background:#4f7aff;border-radius:14px;
    display:flex;align-items:center;justify-content:center;
    font-size:24px;font-weight:800;color:#fff;
  }
  .logo-text{font-size:2rem;font-weight:800;color:#eef4ff;}
  .logo-text em{font-style:normal;color:#7c9fff;}
  .wallet-tag{
    background:rgba(79,122,255,0.1);border:1px solid rgba(79,122,255,0.3);
    border-radius:100px;padding:10px 20px;
    font-size:1rem;color:#7c9fff;font-weight:600;
  }
  .main{display:flex;flex-direction:column;gap:8px;}
  .label{font-size:1rem;color:#4a6a8a;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;}
  .question{font-size:2.8rem;font-weight:800;color:#eef4ff;line-height:1.1;letter-spacing:-0.02em;}
  .amount{
    font-size:5rem;font-weight:800;letter-spacing:-0.03em;line-height:1;
    background:linear-gradient(135deg,#f59e0b,#ef4444,#8b5cf6,#4f7aff);
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  }
  .stats{display:flex;gap:24px;}
  .stat-pill{
    background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
    border-radius:16px;padding:16px 24px;
    display:flex;flex-direction:column;gap:4px;flex:1;
  }
  .stat-label{font-size:0.75rem;color:#4a6a8a;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;}
  .stat-value{font-size:1.4rem;font-weight:800;color:#eef4ff;}
  .bottom{display:flex;align-items:center;justify-content:space-between;}
  .url{font-size:1rem;color:#4a6a8a;font-weight:600;}
  .cta{
    background:linear-gradient(135deg,#4f7aff,#8b5cf6);
    border-radius:14px;padding:14px 28px;
    font-size:1rem;font-weight:700;color:#fff;
  }
</style>
</head>
<body>
<div class="bg"></div>
<div class="grid"></div>
<div class="card">
  <div class="top">
    <div class="logo">
      <div class="logo-icon">$</div>
      <div class="logo-text">Meme<em>Scope</em></div>
    </div>
    <div class="wallet-tag">${chainEmoji} ${short}</div>
  </div>
  <div class="main">
    <div class="label">If I held my meme coins...</div>
    <div class="question">I could have made</div>
    <div class="amount">${totalWhatIf || '$0'}</div>
  </div>
  <div class="stats">
    <div class="stat-pill">
      <div class="stat-label">Coins Traded</div>
      <div class="stat-value">${coinCount || '0'}</div>
    </div>
    <div class="stat-pill">
      <div class="stat-label">Biggest Miss</div>
      <div class="stat-value">${topCoin || 'N/A'}</div>
    </div>
    <div class="stat-pill">
      <div class="stat-label">Value if Held</div>
      <div class="stat-value">${topValue || '$0'}</div>
    </div>
    <div class="stat-pill">
      <div class="stat-label">Chain</div>
      <div class="stat-value">${chain || 'Solana'}</div>
    </div>
  </div>
  <div class="bottom">
    <div class="url">sol-meme-tracker.vercel.app</div>
    <div class="cta">Check yours →</div>
  </div>
</div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
};
