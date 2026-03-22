// ===============================
//  6KXD CFX FINDER – CYBER LUX
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
const serverResources = document.getElementById("serverResources");
const playersList = document.getElementById("playersList");
const serverInfoList = document.getElementById("serverInfoList");
const joinBtn = document.getElementById("joinBtn");
const favoriteBtn = document.getElementById("favoriteBtn");
const uptimeText = document.getElementById("uptimeText");

const playerSearch = document.getElementById("playerSearch");
const resourceSearch = document.getElementById("resourceSearch");

const historyList = document.getElementById("historyList");
const historyListFull = document.getElementById("historyListFull");
const favoritesList = document.getElementById("favoritesList");

const browserTableBody = document.getElementById("browserTableBody");
const browserSearch = document.getElementById("browserSearch");
const browserRefresh = document.getElementById("browserRefresh");

const sidebarItems = document.querySelectorAll(".sidebar-item");
const views = document.querySelectorAll(".view");

const themeToggle = document.getElementById("themeToggle");

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
    serverResources,
    playersList,
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
// RESOURCE CATEGORIES
// ===============================

const resourceTabs = document.querySelectorAll(".resource-tab");

resourceTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    resourceTabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    renderResources(tab.dataset.cat);
  });
});

function categorizeResources(list) {
  const cats = {
    gameplay: [],
    interface: [],
    vehicles: [],
    maps: [],
    scripts: [],
    others: []
  };

  list.forEach(r => {
    const name = r.toLowerCase();

    if (name.includes("weapon") || name.includes("job") || name.includes("police") || name.includes("ambulance"))
      cats.gameplay.push(r);
    else if (name.includes("ui") || name.includes("hud") || name.includes("menu"))
      cats.interface.push(r);
    else if (name.includes("car") || name.includes("vehicle") || name.includes("bike"))
      cats.vehicles.push(r);
    else if (name.includes("map") || name.includes("interior"))
      cats.maps.push(r);
    else if (name.includes("script") || name.includes("addon"))
      cats.scripts.push(r);
    else
      cats.others.push(r);
  });

  return cats;
}

function renderResources(category) {
  serverResources.innerHTML = "";

  if (!currentResources.length) {
    serverResources.innerHTML = "<li>No resources listed.</li>";
    return;
  }

  const cats = categorizeResources(currentResources);
  const list = cats[category] || [];

  const searchTerm = resourceSearch.value.toLowerCase();

  const filtered = list.filter(r => r.toLowerCase().includes(searchTerm));

  if (!filtered.length) {
    serverResources.innerHTML = "<li>No matching resources.</li>";
    return;
  }

  filtered.forEach(r => {
    const li = document.createElement("li");
    li.textContent = r;
    serverResources.appendChild(li);
  });
}

// ===============================
// PLAYER LIST
// ===============================

function renderPlayers(players) {
  playersList.innerHTML = "";

  const searchTerm = playerSearch.value.toLowerCase();

  const filtered = players.filter(p =>
    p.name?.toLowerCase().includes(searchTerm) ||
    String(p.id).includes(searchTerm)
  );

  if (!filtered.length) {
    playersList.innerHTML = "<div class='player-row'>No matching players.</div>";
    return;
  }

  filtered.forEach(p => {
    const row = document.createElement("div");
    row.className = "player-row";

    const avatar = document.createElement("div");
    avatar.className = "player-avatar";
    avatar.textContent = p.name ? p.name[0].toUpperCase() : "?";

    const info = document.createElement("div");
    info.className = "player-info";

    const name = document.createElement("div");
    name.className = "player-name";
    name.textContent = p.name || `ID ${p.id}`;

    const meta = document.createElement("div");
    meta.className = "player-meta";

    const id = document.createElement("span");
    id.className = "player-id";
    id.textContent = `ID ${p.id}`;

    const ping = document.createElement("span");
    ping.className = "player-ping";

    if (p.ping < 60) ping.classList.add("good");
    else if (p.ping < 120) ping.classList.add("mid");
    else ping.classList.add("bad");

    ping.textContent = `${p.ping}ms`;

    meta.appendChild(id);
    meta.appendChild(ping);

    info.appendChild(name);
    info.appendChild(meta);

    row.appendChild(avatar);
    row.appendChild(info);

    playersList.appendChild(row);
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
    renderResources("gameplay");

    currentPlayers = d.players || [];
    renderPlayers(currentPlayers);

    renderInfoPanel(d, code);

    const isFav = favorites.find(f => f.code === code);
    favoriteBtn.textContent = isFav ? "★ Favorited" : "⭐ Favorite";

    favoriteBtn.onclick = () => toggleFavorite(code, d.hostname || "Unknown");

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

// ===============================
// SEARCH LISTENERS
// ===============================

playerSearch.addEventListener("input", () => {
  renderPlayers(currentPlayers);
});

resourceSearch.addEventListener("input", () => {
  const activeTab = document.querySelector(".resource-tab.active");
  renderResources(activeTab.dataset.cat);
});

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
// EVENTS + INIT
// ===============================

analyzeBtn.addEventListener("click", analyzeCFX);

cfxInput.addEventListener("keypress", e => {
  if (e.key === "Enter") analyzeCFX();
});

initTheme();
renderHistory();
renderFavorites();
setTopStatus("idle", "Idle");
