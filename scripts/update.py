#!/usr/bin/env python3
"""Auto updater for SHado's Garden alpha feed.

Stdlib only. Fetches the sources that allow keyless access, scores items
against config/rules.json with the same lessons as the water board
(word-boundary keywords, title gate), dedupes, and merges into
data/signals.json. Manual entries (Muse sweeps: X, Binance announcements,
NFT marketplaces) are never overwritten. Every source fails gracefully.
"""
import json, re, sys, urllib.request, urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UA = {"User-Agent": "shado-alpha-feed/1.0 (+https://x.com/dak_shado)"}

RSS_FEEDS = [
    ("CoinTelegraph", "https://cointelegraph.com/rss", "news"),
    ("CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml", "news"),
    ("Decrypt", "https://decrypt.co/feed", "news"),
    ("The Block", "https://www.theblock.co/rss.xml", "news"),
]
GITHUB_QUERIES = [
    ("privacy zk web3", "Privacy"),
    ("ai agent crypto wallet", "Agentic Wallet"),
    ("zero knowledge privacy protocol", "Privacy"),
]

def fetch(url, timeout=20, accept="*/*"):
    req = urllib.request.Request(url, headers={**UA, "Accept": accept})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()

def word_hit(text, kw):
    return re.search(r"\b" + re.escape(kw.lower()) + r"\b", (text or "").lower()) is not None

def classify(title, rules):
    t = title.lower()
    cats = [
        ("Privacy", ["privacy", "private", "zero-knowledge", "zero knowledge", "zk", "confidential", "mixer", "shielded", "anonymous"]),
        ("Agentic Wallet", ["agentic", "agent wallet", "agent id", "know your agent"]),
        ("AI", ["ai", "artificial intelligence", "llm", "ai agent", "ai agents", "inference", "model"]),
        ("NFTs", ["nft", "mint", "collection"]),
        ("Launches & Airdrops", ["airdrop", "launch", "mainnet", "testnet", "free mint"]),
        ("Listings & Markets", ["listing", "listed", "binance", "coinbase", "trading"]),
        ("Protocol Updates", ["release", "upgrade", "update", "v2", "v3", "governance", "proposal"]),
    ]
    for name, kws in cats:
        if any(word_hit(t, k) for k in kws):
            return name
    return "Web3"

def score(title, summary, category, rules):
    text = (title + " " + (summary or "")).lower()
    s = 40
    for kw, boost in (rules.get("priority_boost") or {}).items():
        if word_hit(text, kw):
            s += int(boost)
    for kw in rules.get("strong_keywords") or []:
        if word_hit(title, kw):
            s += 3
    if category in ("Privacy",):
        s += 5
    return max(5, min(98, s))

def passes_gate(title, rules):
    return any(word_hit(title, kw) for kw in rules.get("strong_keywords") or [])

def parse_rss(name, url, source_type, rules, out):
    try:
        raw = fetch(url)
        root = ET.fromstring(raw)
    except Exception as e:
        print(f"RSS {name} failed: {e}", file=sys.stderr); return
    items = root.findall(".//item")
    if not items:  # Atom
        ns = {"a": "http://www.w3.org/2005/Atom"}
        for e in root.findall(".//a:entry", ns):
            title = (e.findtext("a:title", default="", namespaces=ns) or "").strip()
            link_el = e.find("a:link", ns)
            link = link_el.get("href") if link_el is not None else ""
            if title and link and passes_gate(title, rules):
                out.append(make_signal(title, link, name, source_type, "", "", rules))
        return
    for it in items:
        title = (it.findtext("title") or "").strip()
        link = (it.findtext("link") or "").strip()
        desc = re.sub(r"<[^>]+>", "", it.findtext("description") or "").strip()[:400]
        pub = it.findtext("pubDate") or ""
        date = ""
        try:
            date = parsedate_to_datetime(pub).date().isoformat() if pub else ""
        except Exception:
            date = ""
        if title and link and passes_gate(title, rules):
            out.append(make_signal(title, link, name, source_type, desc, date, rules))

def make_signal(title, url, source, source_type, summary, date, rules):
    cat = classify(title, rules)
    return {
        "id": "auto-" + re.sub(r"[^a-z0-9]+", "-", norm(title))[:60].strip("-"),
        "title": title,
        "project": "",
        "source": source,
        "source_type": source_type,
        "url": url,
        "category": cat,
        "type": "News",
        "summary": summary or title,
        "angle": "",
        "score": score(title, summary, cat, rules),
        "published_at": date or datetime.now(timezone.utc).date().isoformat(),
        "discovered_at": datetime.now(timezone.utc).date().isoformat(),
        "manual": False,
        "tags": [],
    }

def coingecko(rules, out):
    try:
        data = json.loads(fetch("https://api.coingecko.com/api/v3/search/trending", accept="application/json"))
    except Exception as e:
        print(f"CoinGecko failed: {e}", file=sys.stderr); return
    for c in (data.get("coins") or [])[:7]:
        it = c.get("item") or {}
        name = it.get("name") or ""; sym = it.get("symbol") or ""
        if not name: continue
        title = f"Trending on CoinGecko: {name} ({sym})"
        out.append(make_signal(title, f"https://www.coingecko.com/en/coins/{it.get('id','')}", "CoinGecko Trending", "api", f"{name} is in CoinGecko's top trending searches in the last 24 hours, rank #{it.get('market_cap_rank')}.", "", rules))
    for n in (data.get("nfts") or [])[:5]:
        it = n if isinstance(n, dict) else {}
        name = it.get("name") or ""
        if not name: continue
        title = f"Trending NFT collection: {name}"
        sig = make_signal(title, "https://www.coingecko.com/en/nft", "CoinGecko Trending", "api", f"{name} is trending among NFT collections on CoinGecko.", "", rules)
        sig["category"] = "NFTs"; out.append(sig)

def github_search(rules, out):
    for q, cat in GITHUB_QUERIES:
        try:
            url = "https://api.github.com/search/repositories?" + urllib.parse.urlencode({"q": q, "sort": "updated", "order": "desc", "per_page": 5})
            data = json.loads(fetch(url, accept="application/vnd.github+json"))
        except Exception as e:
            print(f"GitHub search failed ({q}): {e}", file=sys.stderr); continue
        for repo in data.get("items") or []:
            title = f"GitHub activity: {repo.get('full_name')}"
            if not passes_gate(repo.get("name") or "", rules) and not passes_gate(repo.get("description") or "", rules):
                continue
            sig = make_signal(title, repo.get("html_url") or "", "GitHub Search", "api", (repo.get("description") or "")[:400], (repo.get("updated_at") or "")[:10], rules)
            sig["category"] = cat; sig["type"] = "Release"; sig["project"] = repo.get("full_name") or ""
            out.append(sig)

def cmc(rules, out):
    try:
        url = "https://pro-api.coinmarketcap.com/public-api/v1/cryptocurrency/listings/latest?" + urllib.parse.urlencode({"start": 1, "limit": 20, "cryptocurrency_type": "coins", "sort": "market_cap", "sort_dir": "desc", "convert": "USD"})
        data = json.loads(fetch(url, accept="application/json"))
        rows = (data.get("data") or [])
    except Exception as e:
        print(f"CMC keyless failed: {e}", file=sys.stderr); return
    # CMC listings alone are not signals; only keep it as a health check here.
    print(f"CMC keyless ok, {len(rows)} rows (not listed as signals)")

def main():
    rules = json.loads((ROOT / "config" / "rules.json").read_text())
    data_file = ROOT / "data" / "signals.json"
    existing = json.loads(data_file.read_text())
    manual = [s for s in existing.get("signals", []) if s.get("manual")]
    fresh = []
    for name, url, st in RSS_FEEDS:
        parse_rss(name, url, st, rules, fresh)
    coingecko(rules, fresh)
    github_search(rules, fresh)
    cmc(rules, fresh)
    # freshness window for auto items
    cutoff = datetime.now(timezone.utc).date() - timedelta(days=14)
    seen, merged = set(), []
    for s in manual + fresh:
        # Dedupe on URL + title together: distinct stories legitimately share
        # one source report URL (a monthly report carries several signals).
        key = norm(s.get("url")) + "|" + norm(s.get("title"))
        if key in seen: continue
        seen.add(key); merged.append(s)
    merged = merged[:120]
    data_file.write_text(json.dumps({"signals": merged}, indent=2, ensure_ascii=False))
    (ROOT / "data" / "last_update.json").write_text(json.dumps({"updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"), "auto_count": len(fresh), "total": len(merged)}, indent=2))
    print(f"done: {len(merged)} signals ({len(manual)} manual, {len(fresh)} auto fetched)")

if __name__ == "__main__":
    main()
