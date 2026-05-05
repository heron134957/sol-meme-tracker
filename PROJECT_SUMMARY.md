# MemeScope — Complete Project Summary
Generated: 2026-05-05

---

## 🔑 YOUR API KEYS & CREDENTIALS

| Service        | Value                                              |
|----------------|----------------------------------------------------|
| Supabase URL   | https://tqaqfrvtonkcxmtdwbtq.supabase.co          |
| Supabase Key   | sb_publishable_LlpQJZYHsqf8IyUnThSL8g_ZQ-IvmJn   |
| Helius API Key | 35969944-0121-4b82-a105-e622adfe38b8              |

⚠️ KEEP THIS FILE PRIVATE — never share or commit to GitHub

---

## 📁 PROJECT FILES

| File              | Purpose                                              |
|-------------------|------------------------------------------------------|
| index.html        | Main app UI — wallet connect, results display        |
| style.css         | All styling — dark crypto theme                      |
| app.js            | All logic — wallet, transactions, prices, analysis   |
| api/cache.js      | Vercel serverless function — reads/writes Supabase   |
| vercel.json       | Vercel deployment config                             |
| package.json      | Node dependencies (Supabase client)                  |

---

## 🗄️ DATABASE

Platform: Supabase (PostgreSQL)
Project: sol-meme-tracker
Project ID: tqaqfrvtonkcxmtdwbtq

Table: wallet_cache
- id: auto-increment primary key
- wallet_address: unique Solana wallet address
- data: JSONB blob of full analysis result
- created_at: when first cached
- updated_at: when last refreshed (cache expires after 24h)

---

## 🌐 HOW TO DEPLOY ON VERCEL

### Step 1 — Push code to GitHub
1. Go to github.com → your repo `sol-meme-tracker`
2. Upload all these files:
   - index.html
   - style.css
   - app.js
   - vercel.json
   - package.json
   - api/cache.js  ← make sure it's inside an `api` folder

### Step 2 — Connect Vercel to GitHub
1. Go to vercel.com → click "Add New Project"
2. Select your `sol-meme-tracker` GitHub repo
3. Click Import → leave all settings default → click Deploy

### Step 3 — Add Environment Variables in Vercel
This is CRITICAL — without these the app won't work.
1. In Vercel dashboard → your project → Settings → Environment Variables
2. Add these one by one:

| Name           | Value                                            |
|----------------|--------------------------------------------------|
| SUPABASE_URL   | https://tqaqfrvtonkcxmtdwbtq.supabase.co        |
| SUPABASE_KEY   | sb_publishable_LlpQJZYHsqf8IyUnThSL8g_ZQ-IvmJn |
| HELIUS_API_KEY | 35969944-0121-4b82-a105-e622adfe38b8            |

3. Click Save → then go to Deployments → click "Redeploy"

### Step 4 — Go Live!
Vercel gives you a free URL like: https://sol-meme-tracker.vercel.app
Share that link with anyone!

---

## 🔧 HOW TO UPDATE THE SITE IN THE FUTURE

1. Edit any file locally
2. Push to GitHub (or edit directly on GitHub)
3. Vercel auto-deploys within 30 seconds — no manual steps needed

---

## 💡 HOW THE APP WORKS

1. User visits site → clicks "Connect Phantom" or "Connect Solflare"
2. Wallet extension pops up → user approves (read-only, no funds at risk)
3. App checks Supabase cache → if data exists and < 24h old, shows it instantly
4. If no cache → calls Helius API to fetch all wallet transactions
5. Parses transactions to find meme coin buys/sells
6. Calls DexScreener API (free, no key needed) for current token prices
7. Calculates "what if you held until now" for each coin
8. Shows results + saves to Supabase cache for future visits

---

## 🌐 APIS USED

| API         | Purpose                        | Cost                    |
|-------------|--------------------------------|-------------------------|
| Helius      | Solana transaction history     | Free (100k credits/mo)  |
| DexScreener | Token prices + market data     | Free forever            |
| Supabase    | Cache database                 | Free (500MB)            |
| Vercel      | Hosting + serverless functions | Free                    |

---

## 💰 COST ESTIMATE

| Users/day | Estimated Monthly Cost |
|-----------|------------------------|
| 0–50      | $0 (all free tiers)    |
| 50–200    | $0–10                  |
| 200–500   | $20–50                 |
| 500+      | $50–200                |

---

## 🔮 FUTURE FEATURES TO ADD

- [ ] MetaMask / EVM wallet support
- [ ] Token price charts (historical graph)
- [ ] PnL calculator (actual profit/loss)
- [ ] Share your stats on Twitter
- [ ] Email alerts for price movements
- [ ] Top gainers leaderboard
- [ ] Premium tier ($5–10/mo for full history)

---

## 🆘 TROUBLESHOOTING

**"Phantom wallet not found"**
→ Install Phantom extension from phantom.app, refresh page

**No coins showing up**
→ Wallet may have no meme coin trade history, or Helius couldn't parse transactions

**Cache not working**
→ Check Vercel environment variables are set correctly and redeployed

**API errors**
→ Check Helius dashboard at helius.dev to see if you've hit rate limits

---

## 📞 SUPPORT RESOURCES

- Helius docs: docs.helius.dev
- Supabase docs: supabase.com/docs
- Vercel docs: vercel.com/docs
- DexScreener API: docs.dexscreener.com

---

Built with ❤️ using Phantom/Solflare + Helius + DexScreener + Supabase + Vercel
