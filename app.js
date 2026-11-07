"use strict";
const STORE_KEY = "sg_saved_v1";
const CATEGORIES = ["All", "Privacy", "AI", "Agentic Wallet", "NFTs", "Launches & Airdrops", "Listings & Markets", "Protocol Updates", "Web3"];
let SIGNALS = [];
let activeCategory = "All";

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
  return '<article class="card">' +
    '<div class="card-top"><span class="tag ' + esc((sig.category || "").split(" ")[0]) + '">' + esc(sig.category || "Web3") + " · " + esc(sig.type || "Update") + '</span><span class="score">⚡ ' + esc(sig.score != null ? sig.score : "") + "</span></div>" +
    '<h3><a href="' + esc(sig.url) + '" target="_blank" rel="noopener">' + esc(sig.title) + "</a></h3>" +
    "<p>" + esc(sig.summary) + "</p>" +
    (sig.angle ? '<div class="angle"><strong>Post angle:</strong> ' + esc(sig.angle) + "</div>" : "") +
    '<div class="card-meta"><span>' + esc(sig.project || "") + '</span><span>' + esc(sig.source || "") + '</span><span>' + esc(timeLabel(sig.published_at)) + "</span>" + badge + "</div>" +
    '<div class="card-actions">' +
      '<button class="draft-btn primary" data-id="' + esc(sig.id) + '">🤖 Draft with Muse</button>' +
      '<button class="save-btn" data-id="' + esc(sig.id) + '">' + (st ? "🔖 Saved" : "🔖 Save") + "</button>" +
      '<a class="button-link" href="' + esc(sig.url) + '" target="_blank" rel="noopener">Original ↗</a>' +
    "</div>" + statusBtns + "</article>";
}

function currentFilters(){
  const q = ($("search") && $("search").value || "").toLowerCase().trim();
  const type = $("type-filter") && $("type-filter").value || "";
  const savedOnly = $("saved-only") && $("saved-only").checked;
  return SIGNALS.filter(sig => {
    if(activeCategory !== "All" && sig.category !== activeCategory) return false;
    if(type && sig.type !== type) return false;
    if(savedOnly && !statusOf(sig.id)) return false;
    if(q){
      const hay = (sig.title + " " + sig.project + " " + sig.summary + " " + (sig.tags || []).join(" ")).toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
}

function render(){
  const list = currentFilters();
  const topEl = $("top-grid"), boardEl = $("board-grid"), savedEl = $("saved-grid");
  if(topEl){
    const tops = SIGNALS.filter(s => (s.score || 0) >= 88).slice(0, 6);
    topEl.innerHTML = tops.map(s => cardHTML(s, false)).join("") || '<p class="empty">No top signals right now.</p>';
  }
  if(boardEl){
    boardEl.innerHTML = list.map(s => cardHTML(s, false)).join("");
    const empty = $("board-empty"); if(empty) empty.hidden = list.length > 0;
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

function init(){
  const chips = $("category-chips");
  if(chips){
    chips.innerHTML = CATEGORIES.map(c => '<button class="chip' + (c === "All" ? " active" : "") + '" data-cat="' + esc(c) + '">' + esc(c) + "</button>").join("");
    chips.querySelectorAll(".chip").forEach(ch => {
      ch.onclick = () => { activeCategory = ch.getAttribute("data-cat"); chips.querySelectorAll(".chip").forEach(x => x.classList.toggle("active", x === ch)); render(); };
    });
  }
  ["search", "type-filter", "saved-only"].forEach(id => { const el = $(id); if(el){ el.addEventListener("input", render); el.addEventListener("change", render); } });
  const close = $("draft-close"); if(close) close.onclick = () => { const m = $("draft-modal"); if(m) m.hidden = true; };
  const modal = $("draft-modal"); if(modal) modal.addEventListener("click", e => { if(e.target === modal) modal.hidden = true; });
  const copy = $("draft-copy"); if(copy) copy.onclick = () => { const ta = $("draft-text"); if(ta){ ta.select(); try { navigator.clipboard.writeText(ta.value); } catch(e){ document.execCommand("copy"); } copy.textContent = "Copied ✓"; setTimeout(() => copy.textContent = "Copy brief", 1500); } };

  fetch("data/signals.json").then(r => r.json()).then(data => {
    SIGNALS = (data.signals || []).slice().sort((a, b) => (b.score || 0) - (a.score || 0) || String(b.published_at).localeCompare(String(a.published_at)));
    const c = $("stat-count"); if(c) c.textContent = SIGNALS.length + " signals on the board";
    render();
  }).catch(() => {
    const b = $("board-grid"); if(b) b.innerHTML = '<p class="empty">Could not load signals. Refresh in a moment.</p>';
  });
  fetch("data/last_update.json").then(r => r.json()).then(u => {
    const el = $("stat-updated"); if(el && u.updated_at) el.textContent = "Last sweep: " + u.updated_at;
  }).catch(() => {});
  fetch("data/sources.json").then(r => r.json()).then(data => {
    const el = $("sources-list"); if(!el) return;
    el.innerHTML = (data.sources || []).map(s => '<div class="source-card"><h4>' + esc(s.name) + ' <span class="pill">' + esc(s.fetch) + '</span></h4><p>' + esc(s.cadence || "") + "</p>" + (s.notes ? "<p>" + esc(s.notes) + "</p>" : "") + "</div>").join("");
  }).catch(() => {});
}
document.addEventListener("DOMContentLoaded", init);
