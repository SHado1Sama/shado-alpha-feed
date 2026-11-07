// SHado's Garden, Money Tracker
// Board of paid opportunities + a localStorage pipeline tracker (Interested -> Paid).
"use strict";

var STATUSES = ["Interested", "Applied", "Doing", "Submitted", "Paid"];
var STORE_KEY = "sg_money_v1";
var TYPES = ["All", "Campaign", "Ambassador", "Bounty", "Bounty Platform", "Creator Platform", "Paid Post", "Quest"];

var OPPS = [];
var tracked = loadTracked();
var activeType = "All";

function loadTracked() {
  try {
    var raw = localStorage.getItem(STORE_KEY);
    var obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch (e) { return {}; }
}
function saveTracked() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(tracked)); } catch (e) {}
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function money(n) {
  if (n == null || isNaN(n)) return null;
  return "$" + Number(n).toLocaleString("en-US");
}
function chipLabel(t) { return t; }

function renderChips() {
  var wrap = document.getElementById("type-chips");
  wrap.innerHTML = "";
  TYPES.forEach(function (t) {
    if (t !== "All" && !OPPS.some(function (o) { return o.type === t; })) return;
    var b = document.createElement("button");
    b.className = "chip" + (activeType === t ? " active" : "");
    b.textContent = chipLabel(t);
    b.addEventListener("click", function () { activeType = t; render(); });
    wrap.appendChild(b);
  });
}

function filtered() {
  var q = (document.getElementById("q").value || "").toLowerCase();
  var trackedOnly = document.getElementById("tracked-only").checked;
  return OPPS.filter(function (o) {
    if (activeType !== "All" && o.type !== activeType) return false;
    if (trackedOnly && !tracked[o.id]) return false;
    if (q) {
      var hay = (o.title + " " + o.project + " " + o.type + " " + o.reward_text + " " + o.summary).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }).sort(function (a, b) { return (b.fit_score || 0) - (a.fit_score || 0); });
}

function statusButtons(o) {
  var cur = tracked[o.id] ? tracked[o.id].status : null;
  if (!cur) {
    return '<button data-act="track" data-id="' + esc(o.id) + '">📌 Track this</button>';
  }
  var html = '<span class="status-badge">' + esc(cur) + "</span>";
  html += '<span class="status-btns">';
  STATUSES.forEach(function (s) {
    html += '<button data-act="status" data-id="' + esc(o.id) + '" data-status="' + esc(s) + '"' + (s === cur ? ' class="on"' : "") + ">" + esc(s) + "</button>";
  });
  html += '<button data-act="untrack" data-id="' + esc(o.id) + '">Remove</button></span>';
  return html;
}

function render() {
  renderChips();
  var list = filtered();
  var grid = document.getElementById("money-grid");
  var parts = [];
  list.forEach(function (o) {
    var est = money(o.reward_usd_est);
    parts.push(
      '<article class="card">' +
      '<div class="card-top"><span class="tag">' + esc(o.type) + '</span>' +
      (o.fit_score ? '<span class="score">Fit ' + o.fit_score + "</span>" : "") + "</div>" +
      "<h3>" + esc(o.title) + "</h3>" +
      '<div class="reward">' + esc(o.reward_text) + "</div>" +
      "<p>" + esc(o.summary) + "</p>" +
      (o.requirements ? '<div class="angle"><strong>What it takes:</strong> ' + esc(o.requirements) + "</div>" : "") +
      '<div class="card-meta">' +
      (est ? "<span>Top value " + est + "</span>" : "<span>Value varies</span>") +
      (o.effort ? "<span>Effort: " + esc(o.effort) + "</span>" : "") +
      (o.deadline ? "<span>⏰ " + esc(o.deadline) + "</span>" : "<span>Rolling / no fixed deadline</span>") +
      "</div>" +
      '<div class="card-meta"><span>Source: ' + esc(o.source) + "</span></div>" +
      '<div class="card-actions">' +
      '<a class="button-link primary" href="' + esc(o.url) + '" target="_blank" rel="noopener">Open / Apply</a>' +
      statusButtons(o) +
      "</div></article>"
    );
  });
  grid.innerHTML = parts.join("");
  document.getElementById("money-empty").hidden = list.length > 0;
  wireActions(grid);
  renderPipeline();
  renderStats();
}

function renderPipeline() {
  var wrap = document.getElementById("pipeline-list");
  var ids = Object.keys(tracked);
  document.getElementById("pipeline-empty").hidden = ids.length > 0;
  if (!ids.length) { wrap.innerHTML = ""; return; }
  var groups = {};
  STATUSES.forEach(function (s) { groups[s] = []; });
  ids.forEach(function (id) {
    var o = OPPS.find(function (x) { return x.id === id; });
    if (o && groups[tracked[id].status]) groups[tracked[id].status].push(o);
  });
  var html = "";
  STATUSES.forEach(function (s) {
    if (!groups[s].length) return;
    html += '<h3 class="pipe-head">' + esc(s) + " (" + groups[s].length + ")</h3>";
    groups[s].forEach(function (o) {
      var est = money(o.reward_usd_est);
      html += '<div class="pipe-row"><span>' + esc(o.title) + (est ? ' <span class="score">' + est + " est.</span>" : "") +
        '</span><span class="status-btns">' +
        STATUSES.map(function (st) {
          return '<button data-act="status" data-id="' + esc(o.id) + '" data-status="' + esc(st) + '"' + (st === s ? ' class="on"' : "") + ">" + esc(st) + "</button>";
        }).join("") +
        '<button data-act="untrack" data-id="' + esc(o.id) + '">Remove</button></span></div>';
    });
  });
  wrap.innerHTML = html;
  wireActions(wrap);
}

function renderStats() {
  var pipeline = 0, earned = 0;
  Object.keys(tracked).forEach(function (id) {
    var o = OPPS.find(function (x) { return x.id === id; });
    if (!o || o.reward_usd_est == null) return;
    if (tracked[id].status === "Paid") earned += o.reward_usd_est;
    else pipeline += o.reward_usd_est;
  });
  document.getElementById("stat-open").textContent = OPPS.length;
  document.getElementById("stat-pipeline").textContent = money(pipeline) || "$0";
  document.getElementById("stat-earned").textContent = money(earned) || "$0";
}

function wireActions(root) {
  var btns = root.querySelectorAll("button[data-act]");
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener("click", function () {
      var id = this.getAttribute("data-id");
      var act = this.getAttribute("data-act");
      if (act === "track") tracked[id] = { status: "Interested" };
      else if (act === "status") tracked[id] = { status: this.getAttribute("data-status") };
      else if (act === "untrack") delete tracked[id];
      saveTracked();
      render();
    });
  }
}

function init() {
  var q = document.getElementById("q");
  if (q) q.addEventListener("input", render);
  var t = document.getElementById("tracked-only");
  if (t) t.addEventListener("change", render);
  fetch("data/money.json", { cache: "no-store" })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      OPPS = (data && data.opportunities) || [];
      render();
    })
    .catch(function () {
      var g = document.getElementById("money-grid");
      if (g) g.innerHTML = '<p class="empty">Could not load the money board. Check your connection and refresh.</p>';
    });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
