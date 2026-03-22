// ===============================
//  6KXD CFX FINDER — CYBER LUX
// ===============================

// DOM ELEMENTS
const cfxInput = document.getElementById("cfxInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusText = document.getElementById("statusText");
const topStatus = document.getElementById("topStatus");

const serverName = document.getElementById("serverName");
const serverPlayers = document.getElementById("serverPlayers");
const serverIcon = document.getElementById("serverIcon");
const serverBanner = document.getElementById("serverBanner");
const serverEndpoints = document.getElementById("serverEndpoints");
const serverInfoList = document.getElementById("serverInfoList");
const joinBtn = document.getElementById("joinBtn");
const favoriteBtn = document.getElementById("favoriteBtn");
const uptimeText = document.getElementById("uptimeText");

const historyList = document.getElementById("historyList");
const historyListFull = document.getElementById("historyListFull");
const favoritesList = document.getElementById("favoritesList");

const browserTableBody = document.getElementById("browserTableBody");
const browserSearch = document.getElementById("browserSearch");
const browserRefresh = document.getElementById("browserRefresh");

const sidebarItems = document.querySelectorAll(".sidebar-item");
const views = document.querySelectorAll(".view");

const themeToggle = document.getElementById("themeToggle");
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const globalSearch = document.getElementById("globalSearch");

// Modal
const openFullPanel = document.getElementById("openFullPanel");
const closeFullPanel = document.getElementById("closeFullPanel");
const fullPanelOverlay = document.getElementById("fullPanelOverlay");

const fullPlayersList = document.getElementById("fullPlayersList");
const fullResourcesList = document.getElementById("fullResourcesList");
const fullPlayerSearch = document.getElementById("fullPlayerSearch");
const fullResourceSearch = document.getElementById("fullResourceSearch");

// Ping graph
const pingCanvas = document.getElementById("pingGraph");
const pingCtx = pingCanvas.getContext("2d");

let currentCode = null;
let currentServerData = null;
let currentResources = [];
let currentPlayers = [];
let favorites = loadFavorites();

let pingHistory = [];
let pingInterval = null;

// ===============================
// STATUS + HELPERS
// ===============================

function setTopStatus(type, message) {
  topStatus.textContent = message;

  topStatus.classList.remove(
    "status-online",
    "status-offline",
    "status-loading",
    "status-idle"
  );

  if (type === "online") topStatus.classList.add("status-online");
  else if (type === "offline") topStatus.classList.add("status-offline");
  else if (type === "loading") topStatus.classList.add("status-loading");
  else topStatus.classList.add("status-idle");
}

function setStatus(type, message) {
  statusText.textContent = message;
  document.getElementById("sidebarStatus").textContent = message;

  if (type === "loading") {
    statusText.style.color = "#4da3ff";
    setTopStatus("loading", "Checking…");
  } else if (type === "online") {
    statusText.style.color = "#4dff88";
    setTopStatus("online", "Online");
  } else if (type === "offline") {
    statusText.style.color = "#ff4d6a";
    setTopStatus("offline", "Offline");
  } else {
    statusText.style.color = "var(--muted)";
    setTopStatus("idle", "Idle");
  }
}

function extractCFX(input) {
  if (!input) return null;
  if (input.includes("cfx.re/join/")) {
    return input.split("cfx.re/join/")[1].trim();
  }
  return input.trim();
}

function setLoadingState(isLoading) {
  const shimmerTargets = [
    serverName,
    serverPlayers,
    serverIcon,
    serverBanner,
    serverEndpoints,
    serverInfoList
  ];

  shimmerTargets.forEach(el => {
    if (!el) return;
    if (isLoading) {
      el.classList.add("loading", "shimmer");
    } else {
      el.classList.remove("loading");
    }
  });

  joinBtn.disabled = isLoading;
}

// ===============================
// HISTORY SYSTEM
// ===============================

function loadHistory() {
  const raw = localStorage.getItem("cfxHistory");
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function saveHistory(history) {
  localStorage.setItem("cfxHistory", JSON.stringify(history.slice(0, 20)));
}

function addToHistory(code, name) {
  let history = loadHistory();
  history = history.filter(h => h.code !== code);
  history.unshift({ code, name: name || "Unknown" });
  saveHistory(history);
  renderHistory();
}

function renderHistory() {
  const history = loadHistory();
  historyList.innerHTML = "";
  historyListFull.innerHTML = "";

  if (!history.length) {
    const li = document.createElement("li");
    li.textContent = "No recent lookups yet.";
    li.style.color = "var(--muted)";
    historyList.appendChild(li);
    historyListFull.appendChild(li.cloneNode(true));
    return;
  }

  history.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="code">${item.code}</span><span>${item.name}</span>`;
    li.addEventListener("click", () => {
      cfxInput.value = item.code;
      switchView("lookup");
      analyzeCFX();
    });
    historyList.appendChild(li);

    const li2 = li.cloneNode(true);
    historyListFull.appendChild(li2);
  });
}

// ===============================
// FAVORITES SYSTEM
// ===============================

function loadFavorites() {
  const raw = localStorage.getItem("cfxFavorites");
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function saveFavorites() {
  localStorage.setItem("cfxFavorites", JSON.stringify(favorites));
}

function toggleFavorite(code, name) {
  const exists = favorites.find(f => f.code === code);

  if (exists) {
    favorites = favorites.filter(f => f.code !== code);
    favoriteBtn.textContent = "⭐ Favorite";
  } else {
    favorites.unshift({ code, name });
    favoriteBtn.textContent = "★ Favorited";
  }

  saveFavorites();
  renderFavorites();
}

function renderFavorites() {
  favoritesList.innerHTML = "";

  if (!favorites.length) {
    const li = document.createElement("li");
    li.textContent = "No favorites yet.";
    li.style.color = "var(--muted)";
    favoritesList.appendChild(li);
    return;
  }

  favorites.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="code">${item.code}</span><span>${item.name}</span>`;
    li.addEventListener("click", () => {
      cfxInput.value = item.code;
      switchView("lookup");
      analyzeCFX();
    });
    favoritesList.appendChild(li);
  });
}

// ===============================
// SERVER INFO PANEL
// ===============================

function renderInfoPanel(d, code) {
  serverInfoList.innerHTML = "";

  const vars = d.vars || {};

  const infoItems = [
    { label: "CFX Code", value: code },
    { label: "Game Build", value: vars.sv_enforceGameBuild || vars.gamebuild || "Unknown" },
    { label: "Locale", value: vars.locale || "Unknown" },
    { label: "Max Players", value: d.sv_maxclients || d.maxClients || d.maxplayers || "Unknown" },
    { label: "Current Players", value: (d.players && d.players.length) || 0 },
    { label: "Project Name", value: vars.sv_projectName || "N/A" },
    { label: "Project Desc", value: vars.sv_projectDesc || "N/A" },
    { label: "Tags", value: vars.tags || "N/A" }
  ];

  infoItems.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="label">${item.label}</span>
      <span class="value">${item.value}</span>
    `;
    serverInfoList.appendChild(li);
  });

  if (d.uptime) {
    const hours = Math.floor(d.uptime / 3600);
    const mins = Math.floor((d.uptime % 3600) / 60);
    uptimeText.textContent = `${hours}h ${mins}m`;
  } else {
    uptimeText.textContent = "Unknown";
  }
}

// ===============================
// PING GRAPH
// ===============================

function resetPingGraph() {
  pingHistory = [];
  drawPingGraph();
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
}

function startPingGraph() {
  resetPingGraph();
  if (!currentPlayers || !currentPlayers.length) return;

  // Seed with initial average
  pushPingSample();

  pingInterval = setInterval(() => {
    pushPingSample();
    drawPingGraph();
  }, 3000);
}

function pushPingSample() {
  if (!currentPlayers || !currentPlayers.length) return;
  const avg =
    currentPlayers.reduce((sum, p) => sum + (p.ping || 0), 0) /
    currentPlayers.length;

  pingHistory.push(avg);
  if (pingHistory.length > 30) pingHistory.shift();
}

function drawPingGraph() {
  const ctx = pingCtx;
  const w = pingCanvas.width;
  const h = pingCanvas.height;

  ctx.clearRect(0, 0, w, h);

  if (!pingHistory.length) {
    ctx.strokeStyle = "rgba(139,144,165,0.6)";
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    return;
  }

  const maxPing = Math.max(...pingHistory, 100);
  const minPing = 0;

  ctx.beginPath();
  ctx.strokeStyle = "#4da3ff";
  ctx.lineWidth = 2;

  pingHistory.forEach((val, idx) => {
    const x = (idx / Math.max(pingHistory.length - 1, 1)) * w;
    const norm = (val - minPing) / (maxPing - minPing || 1);
    const y = h - norm * h;

    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  // Glow
  ctx.strokeStyle = "rgba(77,163,255,0.35)";
  ctx.lineWidth = 4;
  ctx.stroke();
}

// ===============================
// MAIN LOOKUP
// ===============================

async function analyzeCFX() {
  const raw = cfxInput.value.trim();
  const code = extractCFX(raw);

  if (!code || code.length < 4) {
    setStatus("offline", "Invalid CFX code");
    return;
  }

  currentCode = code;
  setStatus("loading", "Checking server…");
  setLoadingState(true);
  resetPingGraph();

  try {
    const res = await fetch(`/api/resolve?code=${code}`);

    if (!res.ok) {
      setStatus("offline", "Server not found or offline");
      setLoadingState(false);
      return;
    }

    const data = await res.json();
    if (!data || !data.Data) {
      setStatus("offline", "Invalid or private server");
      setLoadingState(false);
      return;
    }

    const d = data.Data;
    currentServerData = d;

    setStatus("online", "Server Online");

    serverName.textContent = d.hostname || "Unknown";
    serverPlayers.textContent = `${d.players?.length || 0} players`;

    if (d.icon) {
      serverIcon.src = `data:image/png;base64,${d.icon}`;
      serverIcon.style.display = "block";
    } else {
      serverIcon.style.display = "none";
    }

    const bannerUrl =
      (d.vars && (d.vars.banner_connecting || d.vars.banner_detail)) || null;

    if (bannerUrl) {
      serverBanner.onload = () => serverBanner.classList.add("loaded");
      serverBanner.src = bannerUrl;
      serverBanner.style.display = "block";
    } else {
      serverBanner.style.display = "none";
    }

    serverEndpoints.innerHTML = "";
    (d.connectEndPoints || []).forEach(ip => {
      const li = document.createElement("li");
      li.textContent = ip;
      serverEndpoints.appendChild(li);
    });

    currentResources = d.resources || [];
    currentPlayers = d.players || [];

    renderInfoPanel(d, code);

    const isFav = favorites.find(f => f.code === code);
    favoriteBtn.textContent = isFav ? "★ Favorited" : "⭐ Favorite";

    favoriteBtn.onclick = () =>
      toggleFavorite(code, d.hostname || "Unknown");

    joinBtn.disabled = false;
    joinBtn.onclick = () => {
      if (d.connectEndPoints && d.connectEndPoints.length) {
        window.location.href = `fivem://connect/${d.connectEndPoints[0]}`;
      } else {
        window.open(`https://cfx.re/join/${code}`, "_blank");
      }
    };

    addToHistory(code, d.hostname || "Unknown");
    startPingGraph();

  } catch (err) {
    console.error(err);
    setStatus("offline", "Proxy error — check backend");
  } finally {
    setLoadingState(false);
  }
}

// ===============================
// MODAL RENDER + SEARCH
// ===============================

function renderFullPanel() {
  const pSearch = fullPlayerSearch.value.toLowerCase();
  const rSearch = fullResourceSearch.value.toLowerCase();

  // Players
  fullPlayersList.innerHTML = "";
  currentPlayers
    .filter(p =>
      (p.name || "").toLowerCase().includes(pSearch) ||
      String(p.id).includes(pSearch)
    )
    .forEach(p => {
      const div = document.createElement("div");
      div.className = "player-row";
      div.innerHTML = `
        <div class="player-avatar">${p.name ? p.name[0].toUpperCase() : "?"}</div>
        <div class="player-info">
          <div class="player-name">${p.name}</div>
          <div class="player-meta">ID ${p.id} • ${p.ping}ms</div>
        </div>
      `;
      fullPlayersList.appendChild(div);
    });

  // Resources
  fullResourcesList.innerHTML = "";
  currentResources
    .filter(r => r.toLowerCase().includes(rSearch))
    .forEach(r => {
      const li = document.createElement("div");
      li.className = "player-row";
      li.textContent = r;
      fullResourcesList.appendChild(li);
    });
}

openFullPanel.addEventListener("click", () => {
  renderFullPanel();
  fullPanelOverlay.classList.add("visible");
});

closeFullPanel.addEventListener("click", () => {
  fullPanelOverlay.classList.remove("visible");
});

fullPlayerSearch.addEventListener("input", renderFullPanel);
fullResourceSearch.addEventListener("input", renderFullPanel);

// ===============================
// GLOBAL SERVER BROWSER
// ===============================

async function loadGlobalServers() {
  browserTableBody.innerHTML = `
    <tr><td colspan="5" class="muted">Loading…</td></tr>
  `;

  try {
    const res = await fetch("/api/servers");
    if (!res.ok) {
      browserTableBody.innerHTML = `
        <tr><td colspan="5" class="muted">Failed to load servers.</td></tr>
      `;
      return;
    }

    const list = await res.json();
    renderBrowserTable(list);

  } catch (err) {
    browserTableBody.innerHTML = `
      <tr><td colspan="5" class="muted">Error loading servers.</td></tr>
    `;
  }
}

function renderBrowserTable(list) {
  const search = browserSearch.value.toLowerCase();

  const filtered = list.filter(s =>
    s.hostname.toLowerCase().includes(search) ||
    (s.vars?.tags || "").toLowerCase().includes(search) ||
    (s.vars?.locale || "").toLowerCase().includes(search)
  );

  if (!filtered.length) {
    browserTableBody.innerHTML = `
      <tr><td colspan="5" class="muted">No servers match your search.</td></tr>
    `;
    return;
  }

  browserTableBody.innerHTML = "";

  filtered.forEach(s => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${s.hostname}</td>
      <td>${s.players?.length || 0}</td>
      <td>${s.vars?.locale || "—"}</td>
      <td>${s.vars?.tags || "—"}</td>
      <td><button class="outline-btn small-btn" data-code="${s.joinId}">Join</button></td>
    `;

    tr.querySelector("button").onclick = () => {
      window.open(`https://cfx.re/join/${s.joinId}`, "_blank");
    };

    browserTableBody.appendChild(tr);
  });
}

browserRefresh.addEventListener("click", loadGlobalServers);

browserSearch.addEventListener("input", () => {
  if (browserTableBody.children.length > 0) {
    loadGlobalServers();
  }
});

// ===============================
// SIDEBAR NAVIGATION
// ===============================

function switchView(view) {
  sidebarItems.forEach(i => i.classList.remove("active"));
  views.forEach(v => v.classList.remove("active"));

  document.querySelector(`[data-view="${view}"]`).classList.add("active");
  document.getElementById(`view-${view}`).classList.add("active");
}

sidebarItems.forEach(item => {
  item.addEventListener("click", () => {
    const view = item.dataset.view;
    switchView(view);

    if (view === "browser") loadGlobalServers();
    if (view === "favorites") renderFavorites();
    if (view === "history") renderHistory();
  });
});

// ===============================
// THEME
// ===============================

function initTheme() {
  const saved = localStorage.getItem("cfxTheme");
  if (saved === "light") {
    document.body.classList.add("light");
    themeToggle.textContent = "Light";
  } else {
    document.body.classList.remove("light");
    themeToggle.textContent = "Dark";
  }
}

themeToggle.addEventListener("click", () => {
  const isLight = document.body.classList.toggle("light");
  localStorage.setItem("cfxTheme", isLight ? "light" : "dark");
  themeToggle.textContent = isLight ? "Light" : "Dark";
});

// ===============================
// SIDEBAR COLLAPSE
// ===============================

sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
});

// ===============================
// GLOBAL SEARCH
// ===============================

globalSearch.addEventListener("keypress", e => {
  if (e.key === "Enter") {
    const val = globalSearch.value.trim();
    if (!val) return;
    cfxInput.value = val;
    switchView("lookup");
    analyzeCFX();
  }
});

// ===============================
// INIT
// ===============================

analyzeBtn.addEventListener("click", analyzeCFX);

cfxInput.addEventListener("keypress", e => {
  if (e.key === "Enter") analyzeCFX();
});

initTheme();
renderHistory();
renderFavorites();
setTopStatus("idle", "Idle");
drawPingGraph();
