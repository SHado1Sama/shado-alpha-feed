# Sources

Full machine-readable list: data/sources.json

## Auto-fetchable (GitHub Actions, every 3 hours)
- CoinGecko Trending, keyless API: trending coins, NFTs and categories. Verified 2026-11-07: keyless public API, no account, shared rate limits.
- CoinMarketCap Keyless API: listings and market data routes without a key. Verified 2026-11-07: 36 keyless endpoints documented. News and community narratives remain sweep-only.
- GitHub Search API: repository search, unauthenticated limit 10 requests per minute. Verified 2026-11-07 from GitHub's own docs. Updater uses 3 queries per run.
- RSS: CoinTelegraph (cointelegraph.com/rss), CoinDesk (coindesk.com/arc/outboundfeeds/rss), Decrypt (decrypt.co/feed), The Block (theblock.co/rss.xml). Feed addresses verified 2026-11-07.

## Muse sweep only (twice daily)
- X / Twitter: no usable public API, login wall for profile reads. Earliest signals live here, so sweeps start here.
- Binance announcements, Alpha and Square: no official RSS feed exists.
- CoinMarketCap Community: narratives and community alpha beyond the keyless API.
- NFT marketplaces and mint calendars: OpenSea, Blur, Magic Eden, project mint pages and mint indexes. No free keyless sales API.
- Project blogs, Medium, Mirror, governance forums, GitHub releases for watched projects (see config/rules.json watched_projects).
- Public Telegram and Discord announcement channels, read-only.

## Money sources (sweep only)

| Source | What Muse looks for | Layer |
| --- | --- | --- |
| Superteam Earn | New content bounties and gigs, threads and deep dives in the Privacy and AI niche | Sweep |
| Zealy | Creator Quests paying USDC for X content, community sprints | Sweep |
| Galxe and Layer3 | Campaigns with token rewards open to creators | Sweep |
| Ambassador program pages and roundups | New or reopened ambassador intakes from Privacy, AI and major ecosystem projects | Sweep |
| X campaign announcements | Paid post campaigns and KOL calls from projects in the SHado niche | Sweep |
