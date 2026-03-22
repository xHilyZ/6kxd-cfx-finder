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

// Modal
const openFullPanel = document.getElementById("openFullPanel");
const closeFullPanel = document.getElementById("closeFullPanel");
const fullPanelOverlay = document.getElementById("fullPanelOverlay");

const fullPlayersList = document.getElementById("fullPlayersList");
const fullResourcesList = document.getElementById("fullResourcesList");
const fullPlayerSearch = document.getElementById("fullPlayerSearch");
const fullResourceSearch = document.getElementById("fullResourceSearch");

let currentCode = null;
let currentServerData = null;
let currentResources = [];
let currentPlayers = [];
let favorites = loadFavorites();

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

  } catch (err) {
    console.error(err);
    setStatus("offline", "Proxy error — check backend");
  } finally {
    setLoadingState(false);
  }
}
