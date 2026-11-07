# SHado's Garden, Alpha Feed

A live board for the @dak_shado X brand (SHado's Garden: Privacy x AI x Web3) that gathers early signals from everywhere projects drop updates, and turns each one into ready content material.

## What it does
- Board of signals ranked by an alpha score, with a Top Signals strip
- Filters by category (Privacy, AI, Agentic Wallet, NFTs, Launches & Airdrops, Listings & Markets, Protocol Updates, Web3), type and search
- Every card has a Post angle, a suggested way to turn the signal into content
- Save signals and track them locally in your browser: Saved, Drafted, Posted. The same status shows as a badge on the board card
- Draft with Muse button on every card: a copy-ready brief for your own Muse agent to verify the original source and draft a post plus a thread, no hype, no financial advice, never auto-posting

## How it updates, honestly
Two layers, because not every source allows automation:

1. Auto layer (GitHub Actions, every 3 hours): sources with keyless access
   - CoinGecko trending API (coins, NFTs, categories)
   - CoinMarketCap keyless API (health-checked each run)
   - GitHub Search API (privacy, ZK and AI agent repos, recently updated)
   - RSS: CoinTelegraph, CoinDesk, Decrypt, The Block
   Items pass a title gate and scoring rules (config/rules.json) before they land.

2. Muse sweep layer (twice daily): sources with no public feed
   - X / Twitter project and alpha accounts
   - Binance announcements, Binance Alpha and Binance Square
   - CoinMarketCap community narratives
   - NFT marketplaces and mint calendars (mints, trending collections, notable sales)
   - Project blogs, governance forums and GitHub releases for watched projects
   Sweep findings are added as manual entries and are never overwritten by the auto layer.

## Money Tracker

`money.html` is the paid work board: campaigns, ambassador programs, creator bounties and paid content gigs that fit the @dak_shado page, stored in `data/money.json`. Each card shows the reward, what it takes, effort and an honest fit score for a focused page of about 2,500 followers. A browser-local pipeline tracker (localStorage `sg_money_v1`) moves each opportunity Interested, Applied, Doing, Submitted, Paid, with pipeline and earned estimate totals. The money board is sweep-fed only (no keyless API lists live paid gigs reliably); the Muse sweep hunts Superteam Earn, Zealy, Galxe, Layer3, ambassador program pages and X campaign announcements, and rejects anything that charges a fee to apply.

## Rules
See RULES.md and config/rules.json. Short version: Privacy weighted first so the brand does not drift, original source link required, dedupe by URL then title, auto items expire after 14 days, no price predictions or buy/sell language anywhere.

## Run locally
Open index.html via any static server, for example `python3 -m http.server` in this folder.
Run the updater manually with `python3 scripts/update.py`.

## Deploy
GitHub Pages with source = GitHub Actions. The workflow file must be added through the GitHub web UI or a local git push (the Muse GitHub App cannot write workflow files).
