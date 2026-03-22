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

const welcomeOverlay = document.getElementById("welcomeOverlay");
const enterBtn = document.getElementById("enterBtn");
const pageWrap = document.querySelector(".page-wrap");

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
