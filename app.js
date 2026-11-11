"use strict";
const STORE_KEY = "sg_saved_v1";
const CATEGORIES = ["All", "Privacy", "AI", "Agentic Wallet", "NFTs", "Launches & Airdrops", "Listings & Markets", "Protocol Updates", "Web3"];
let SIGNALS = [];
let activeCategory = "All";
let sortMode = "new";

function $(id){ return document.getElementById(id); }
function loadStore(){ try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch(e){ return {}; } }
function saveStore(s){ try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch(e){} }
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function timeLabel(iso){
  if(!iso) return "";
  const d = new Date(iso + (iso.length === 10 ? "T12:00:00Z" : ""));
  if(isNaN(d)) return iso;
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if(days <= 0) return "today";
  if(days === 1) return "1 day ago";
  return days + " days ago";
}
function statusOf(id){ const s = loadStore(); return s[id] || null; }

function cardHTML(sig, inSaved){
  const st = statusOf(sig.id);
  const badge = st && st !== "saved" ? '<span class="status-badge ' + esc(st) + '">' + (st === "drafted" ? "✍️ Drafted" : "✅ Posted") + "</span>" : "";
  const statusBtns = st ? '<div class="status-btns">' +
    ["saved","drafted","posted"].map(s => '<button data-status="' + s + '" data-id="' + esc(sig.id) + '" class="status-btn' + (st === s ? " on" : "") + '">' + s[0].toUpperCase() + s.slice(1) + "</button>").join("") + "</div>" : "";
  return '<article class="sig">' +
    '<div class="sig-meta"><a class="src-link" href="' + esc(sig.url) + '" target="_blank" rel="noopener">' + esc(sig.source || "Source") + " ↗</a>" +
      (sig.published_at ? "<span>· " + esc(timeLabel(sig.published_at)) + "</span>" : "") +
      '<span class="score">⚡ ' + esc(sig.score != null ? sig.score : "") + "</span></div>" +
    '<h3><a href="' + esc(sig.url) + '" target="_blank" rel="noopener">' + esc(sig.title) + "</a></h3>" +
    "<p>" + esc(sig.summary) + "</p>" +
    (sig.angle ? '<div class="angle"><strong>Post angle:</strong> ' + esc(sig.angle) + "</div>" : "") +
    '<div class="sig-foot"><span class="tag ' + esc((sig.category || "").split(" ")[0]) + '">' + esc(sig.category || "Web3") + " · " + esc(sig.type || "Update") + "</span>" +
      (sig.project ? '<span class="sig-meta">' + esc(sig.project) + "</span>" : "") + badge +
      '<span class="card-actions">' +
      '<button class="draft-btn primary" data-id="' + esc(sig.id) + '">Draft with Muse</button>' +
      '<button class="save-btn" data-id="' + esc(sig.id) + '">' + (st ? "Saved ✓" : "Save") + "</button>" +
      '<a class="button-link" href="' + esc(sig.url) + '" target="_blank" rel="noopener">Original ↗</a>' +
      "</span></div>" + statusBtns + "</article>";
}

function currentFilters(){
  const q = ($("search") && $("search").value || "").toLowerCase().trim();
  const type = $("type-filter") && $("type-filter").value || "";
  const savedOnly = $("saved-only") && $("saved-only").checked;
  const out = SIGNALS.filter(sig => {
    if(activeCategory !== "All" && sig.category !== activeCategory) return false;
    if(type && sig.type !== type) return false;
    if(savedOnly && !statusOf(sig.id)) return false;
    if(q){
      const hay = (sig.title + " " + sig.project + " " + sig.summary + " " + (sig.tags || []).join(" ")).toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
  if(sortMode === "new") out.sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)) || (b.score || 0) - (a.score || 0));
  else out.sort((a, b) => (b.score || 0) - (a.score || 0) || String(b.published_at).localeCompare(String(a.published_at)));
  return out;
}

let boardVisible = 18;
let lastFilterKey = "";
function render(){
  const list = currentFilters();
  const topEl = $("top-grid"), boardEl = $("board-grid"), savedEl = $("saved-grid");
  const filtering = activeCategory !== "All" || !!(($("type-filter") && $("type-filter").value)) || !!((($("search") && $("search").value) || "").trim()) || !!(($("saved-only") && $("saved-only").checked));
  const cfBtn = $("clear-filters"); if(cfBtn) cfBtn.hidden = !filtering;
  const topSection = $("top-signals");
  if(topSection) topSection.style.display = filtering ? "none" : "";
  if(topEl){
    const tops = SIGNALS.filter(s => (s.score || 0) >= 88).slice(0, 6);
    topEl.innerHTML = tops.map(s => cardHTML(s, false)).join("") || '<p class="empty">No top signals right now.</p>';
  }
  if(boardEl){
    const key = [activeCategory, sortMode, ($("search") && $("search").value) || "", ($("type-filter") && $("type-filter").value) || "", ($("saved-only") && $("saved-only").checked) || ""].join("|");
    if(key !== lastFilterKey){ lastFilterKey = key; boardVisible = 18; }
    const shown = list.slice(0, boardVisible);
    boardEl.innerHTML = shown.map(s => cardHTML(s, false)).join("");
    const empty = $("board-empty"); if(empty) empty.hidden = list.length > 0;
    const more = $("show-more");
    if(more){
      if(list.length > shown.length){ more.hidden = false; more.textContent = "Show more signals (" + (list.length - shown.length) + " more)"; }
      else more.hidden = true;
    }
  }
  if(savedEl){
    const store = loadStore();
    const saved = SIGNALS.filter(s => store[s.id]);
    savedEl.innerHTML = saved.map(s => cardHTML(s, true)).join("");
    const se = $("saved-empty"); if(se) se.style.display = saved.length ? "none" : "";
  }
  wireCards();
}

function draftBrief(sig){
  return [
    "You are helping SHado (@dak_shado, SHado's Garden) turn one early Web3 signal into X content. Brand: Privacy and AI first, Web3 generally. Voice: clear, simple, explanatory, like the pinned AURION post, break the thing into layers a beginner can follow, end with a question for the audience.",
    "",
    "SIGNAL",
    "Title: " + sig.title,
    "Project: " + (sig.project || ""),
    "Category: " + (sig.category || "") + " / " + (sig.type || ""),
    "Source: " + (sig.source || ""),
    "Original link (verify this first, do not draft from the summary alone): " + sig.url,
    "Summary from the board: " + sig.summary,
    "Suggested post angle: " + (sig.angle || ""),
    "",
    "RULES",
    "1. Open the original source and verify every fact before drafting. Flag anything you cannot verify.",
    "2. Draft ONE short X post (under 280 characters) and ONE longer thread version (4 to 7 posts).",
    "3. No price predictions, no buy or sell calls, no guaranteed returns, no hype words like 'guaranteed' or '100x'. This is content, not financial advice.",
    "4. Include the original source link in the last thread post.",
    "5. Do not use em dashes. Use commas or restructure.",
    "6. Do not post anything. Drafts only, I post myself."
  ].join("\n");
}

function wireCards(){
  document.querySelectorAll(".save-btn").forEach(btn => {
    btn.onclick = () => {
      const store = loadStore(); const id = btn.getAttribute("data-id");
      if(store[id]) delete store[id]; else store[id] = "saved";
      saveStore(store); render();
    };
  });
  document.querySelectorAll(".status-btn").forEach(btn => {
    btn.onclick = () => {
      const store = loadStore(); const id = btn.getAttribute("data-id");
      store[id] = btn.getAttribute("data-status"); saveStore(store); render();
    };
  });
  document.querySelectorAll(".draft-btn").forEach(btn => {
    btn.onclick = () => {
      const sig = SIGNALS.find(s => s.id === btn.getAttribute("data-id"));
      const modal = $("draft-modal"), ta = $("draft-text");
      if(sig && modal && ta){ ta.value = draftBrief(sig); modal.hidden = false; }
    };
  });
}

function loadSignals(){
  fetch("data/signals.json", { cache: "no-store" }).then(r => r.json()).then(data => {
    SIGNALS = (data.signals || []).slice().sort((a, b) => (b.score || 0) - (a.score || 0) || String(b.published_at).localeCompare(String(a.published_at)));
    const c = $("stat-count"); if(c) c.textContent = SIGNALS.length + " signals on the board";
    render();
  }).catch(() => {
    const html = '<div class="error-block"><p><strong>Could not load signals.</strong> Check your connection, then try again.</p><button class="retry-btn" type="button">Retry</button></div>';
    const b = $("board-grid"); if(b){ b.innerHTML = html; const rb = b.querySelector(".retry-btn"); if(rb) rb.onclick = loadSignals; }
    const t = $("top-grid"); if(t) t.innerHTML = "";
    const c2 = $("stat-count"); if(c2) c2.textContent = "Could not load signals";
  });
}

function init(){
  const chips = $("category-chips");
  if(chips){
    chips.innerHTML = CATEGORIES.map(c => '<button class="chip' + (c === "All" ? " active" : "") + '" data-cat="' + esc(c) + '">' + esc(c) + "</button>").join("");
    chips.querySelectorAll(".chip").forEach(ch => {
      ch.onclick = () => { activeCategory = ch.getAttribute("data-cat"); chips.querySelectorAll(".chip").forEach(x => x.classList.toggle("active", x === ch)); render(); };
    });
  }
  ["search", "type-filter", "saved-only"].forEach(id => { const el = $(id); if(el){ el.addEventListener("input", render); el.addEventListener("change", render); } });
  const sortSel = $("sort-filter"); if(sortSel) sortSel.addEventListener("change", () => { sortMode = sortSel.value; render(); });
  const cfBtn = $("clear-filters"); if(cfBtn) cfBtn.onclick = () => {
    activeCategory = "All";
    const s = $("search"); if(s) s.value = "";
    const tf = $("type-filter"); if(tf) tf.value = "";
    const so = $("saved-only"); if(so) so.checked = false;
    const ch = $("category-chips"); if(ch) ch.querySelectorAll(".chip").forEach(x => x.classList.toggle("active", x.getAttribute("data-cat") === "All"));
    render();
  };
  const sm = $("show-more"); if(sm) sm.addEventListener("click", () => { boardVisible += 18; render(); });
  const watch = $("watch-chips");
  if(watch){
    const groups = [
      ["🔒 Privacy", ["Zama", "Arcium", "Miden", "Aztec", "Midnight", "Nillion", "Aleo", "Fhenix", "Inco", "Secret Network", "Oasis", "Railgun", "Penumbra", "Namada", "Zcash", "Mina", "Light Protocol"]],
      ["🤖 AI", ["Sentient", "Gensyn", "Prime Intellect", "ElizaOS", "Bittensor", "Virtuals", "Venice AI", "NEAR AI", "Fetch.ai", "Ritual", "Sahara AI"]],
      ["👛 Agentic Wallet", ["Binance Agentic Wallet", "Agent ID", "Coinbase AgentKit", "Solana Agent Kit", "Crossmint", "Skyfire", "Wayfinder", "Giza"]]
    ];
    watch.innerHTML = groups.map(g =>
      '<div class="watch-group"><span class="watch-label">' + esc(g[0]) + '</span><span class="chips">' +
      g[1].map(p => '<button class="chip" data-proj="' + esc(p) + '">' + esc(p) + "</button>").join("") +
      "</span></div>"
    ).join("");
    watch.querySelectorAll(".chip").forEach(ch => {
      ch.onclick = () => {
        const s = $("search");
        if(s){ s.value = ch.getAttribute("data-proj"); s.dispatchEvent(new Event("input", { bubbles: true })); }
        const b = $("board"); if(b) b.scrollIntoView({ behavior: "smooth" });
      };
    });
  }
  const close = $("draft-close"); if(close) close.onclick = () => { const m = $("draft-modal"); if(m) m.hidden = true; };
  const modal = $("draft-modal"); if(modal) modal.addEventListener("click", e => { if(e.target === modal) modal.hidden = true; });
  const copy = $("draft-copy"); if(copy) copy.onclick = () => { const ta = $("draft-text"); if(ta){ ta.select(); try { navigator.clipboard.writeText(ta.value); } catch(e){ document.execCommand("copy"); } copy.textContent = "Copied ✓"; setTimeout(() => copy.textContent = "Copy brief", 1500); } };

  loadSignals();
  fetch("data/last_update.json", { cache: "no-store" }).then(r => r.json()).then(u => {
    const el = $("stat-updated"); if(el && u.updated_at) el.textContent = "Last sweep: " + u.updated_at;
  }).catch(() => {});
  fetch("data/sources.json", { cache: "no-store" }).then(r => r.json()).then(data => {
    const el = $("sources-list"); if(!el) return;
    el.innerHTML = (data.sources || []).map(s => '<div class="source-card"><h4>' + esc(s.name) + ' <span class="pill">' + esc(s.fetch) + '</span></h4><p>' + esc(s.cadence || "") + "</p>" + (s.notes ? "<p>" + esc(s.notes) + "</p>" : "") + "</div>").join("");
  }).catch(() => {});
}
document.addEventListener("DOMContentLoaded", init);
