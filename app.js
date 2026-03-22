/* ============================
   ELEMENT REFERENCES
============================ */
const input = document.getElementById("cfxInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const serverInfo = document.getElementById("serverInfo");
const jsonOutput = document.getElementById("jsonOutput");
const jsonButtons = document.getElementById("jsonButtons");
const greeting = document.getElementById("greeting");

const recentLookups = document.getElementById("recentLookups");
const recentList = document.getElementById("recentList");
const clearRecent = document.getElementById("clearRecent");

const autoRefreshSelect = document.getElementById("autoRefreshSelect");
const lastRefresh = document.getElementById("lastRefresh");

const serverStatusDot = document.getElementById("serverStatusDot");
const serverStatusText = document.getElementById("serverStatusText");

const serverBannerWrap = document.getElementById("serverBannerWrap");
const serverBanner = document.getElementById("serverBanner");

const pingHeatmap = document.getElementById("pingHeatmap");

let lastData = null;
let lastCode = null;
let refreshInterval = null;

/* ============================
   UTILITY FUNCTIONS
============================ */

// Remove FiveM color codes (^1 ^2 ^3 etc)
function cleanName(name) {
  return name.replace(/\^[0-9]/g, "");
}

// Escape HTML to prevent <3 and < > breaking DOM
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

// Advanced auto-detect: CFX code anywhere in string
function extractCFX(input) {
  const urlMatch = input.match(/cfx\.re\/join\/([A-Za-z0-9]{6,8})/);
  if (urlMatch) return urlMatch[1];

  const codeMatch = input.match(/([A-Za-z0-9]{6,8})/);
  if (codeMatch) return codeMatch[1];

  return null;
}

// Save recent lookups
function saveRecent(code) {
  let list = JSON.parse(localStorage.getItem("recentLookups") || "[]");

  list = list.filter(c => c !== code);
  list.unshift(code);

  if (list.length > 10) list.pop();

  localStorage.setItem("recentLookups", JSON.stringify(list));
  renderRecent();
}

// Render recent lookups
function renderRecent() {
  let list = JSON.parse(localStorage.getItem("recentLookups") || "[]");

  if (list.length === 0) {
    recentLookups.style.display = "none";
    return;
  }

  recentLookups.style.display = "block";
  recentList.innerHTML = "";

  list.forEach(code => {
    const div = document.createElement("div");
    div.className = "recent-item";
    div.textContent = code;
    div.onclick = () => {
      input.value = code;
      analyze();
    };
    recentList.appendChild(div);
  });
}

// Update server status indicator
function updateStatus(ms, success = true) {
  if (!success) {
    serverStatusDot.style.background = "#ef4444";
    serverStatusText.textContent = "Offline";
    serverStatusText.style.color = "#ef4444";
    return;
  }

  if (ms > 5000) {
    serverStatusDot.style.background = "#ef4444";
    serverStatusText.textContent = "Offline";
    serverStatusText.style.color = "#ef4444";
  } else if (ms > 1500) {
    serverStatusDot.style.background = "#facc15";
    serverStatusText.textContent = "Slow";
    serverStatusText.style.color = "#facc15";
  } else {
    serverStatusDot.style.background = "#4ade80";
    serverStatusText.textContent = "Online";
    serverStatusText.style.color = "#4ade80";
  }
}

// GeoIP lookup
async function fetchGeoIP(ip) {
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await res.json();
    return `${data.country_name || "Unknown"} ${data.country ? "🇦🇺" : ""}`;
  } catch {
    return "Unknown";
  }
}

/* ============================
   FETCH SERVER DATA
============================ */
async function fetchServer(code) {
  const url = `${window.location.origin}/api/resolve?code=${code}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Invalid CFX code");
  return res.json();
}

/* ============================
   MAIN ANALYZE FUNCTION
============================ */
async function analyze(isAuto = false) {
  const raw = input.value.trim();
  if (!raw && !isAuto) return alert("Enter a CFX code");

  const code = isAuto ? lastCode : extractCFX(raw);
  if (!code && !isAuto) return alert("Invalid CFX link or code.");

  lastCode = code;
  saveRecent(code);

  greeting.style.display = "none";
  serverInfo.style.display = "block";

  serverInfo.style.opacity = "0.4";
  document.getElementById("serverName").textContent = "Loading...";
  document.getElementById("serverIP").textContent = "";
  document.getElementById("statPlayers").textContent = "";
  document.getElementById("statResources").textContent = "";
  document.getElementById("statBuild").textContent = "";
  document.getElementById("statLocale").textContent = "";
  document.getElementById("serverDesc").textContent = "";
  document.getElementById("serverLoc").textContent = "";
  document.getElementById("serverCountry").textContent = "";

  jsonButtons.style.display = "none";
  document.getElementById("openFullPanel").style.display = "none";
  jsonOutput.style.display = "none";

  const startTime = performance.now();

  try {
    const data = await fetchServer(code);
    lastData = data;

    const endTime = performance.now();
    updateStatus(endTime - startTime, true);

    renderServer(data);
    renderHeatmap(data.Data.players);

    jsonButtons.style.display = "flex";
    document.getElementById("openFullPanel").style.display = "block";

    lastRefresh.textContent = `Last refresh: ${new Date().toLocaleTimeString()}`;

  } catch (err) {
    updateStatus(0, false);
    document.getElementById("serverName").textContent = "Failed to fetch server data.";
  }
}

/* ============================
   RENDER SERVER INFO
============================ */
async function renderServer(data) {
  const d = data.Data;

  const nameEl = document.getElementById("serverName");
  const ipEl = document.getElementById("serverIP");
  const playersEl = document.getElementById("statPlayers");
  const resourcesEl = document.getElementById("statResources");
  const buildEl = document.getElementById("statBuild");
  const localeEl = document.getElementById("statLocale");
  const descEl = document.getElementById("serverDesc");
  const locEl = document.getElementById("serverLoc");
  const countryEl = document.getElementById("serverCountry");

  // Icon
  const iconEl = document.querySelector(".server-icon");
  const iconUrl = `https://servers-frontend.fivem.net/api/servers/icon/${data.EndPoint}.png`;
  iconEl.style.backgroundImage = `url(${iconUrl})`;

  // Banner
  if (d.vars?.banner_detail) {
    serverBanner.src = d.vars.banner_detail;
    serverBannerWrap.style.display = "block";
  } else {
    serverBannerWrap.style.display = "none";
  }

  nameEl.textContent = escapeHTML(cleanName(d.hostname));
  ipEl.textContent = `IP: ${d.connectEndPoints?.[0] || "Unknown"}`;

  playersEl.textContent = `${d.clients} / ${d.sv_maxclients}`;
  resourcesEl.textContent = d.resources.length;
  buildEl.textContent = d.vars?.sv_enforceGameBuild || "Unknown";
  localeEl.textContent = d.locale || "Unknown";

  descEl.textContent = escapeHTML(d.vars?.sv_projectDesc || "No description");
  locEl.textContent = "Location info unavailable.";

  // GeoIP
  const ip = d.connectEndPoints?.[0]?.split(":")[0];
  if (ip) {
    countryEl.textContent = await fetchGeoIP(ip);
  }

  serverInfo.style.opacity = "1";
}

/* ============================
   HEATMAP
============================ */
function renderHeatmap(players) {
  if (!players || players.length === 0) {
    pingHeatmap.style.display = "none";
    return;
  }

  pingHeatmap.style.display = "block";
  pingHeatmap.innerHTML = "";

  const ranges = {
    "0–50ms": players.filter(p => p.ping <= 50).length,
    "50–100ms": players.filter(p => p.ping > 50 && p.ping <= 100).length,
    "100–150ms": players.filter(p => p.ping > 100 && p.ping <= 150).length,
    "150ms+": players.filter(p => p.ping > 150).length
  };

  const max = Math.max(...Object.values(ranges));

  for (const [label, count] of Object.entries(ranges)) {
    const row = document.createElement("div");
    row.className = "heatmap-row";

    const lbl = document.createElement("div");
    lbl.className = "heatmap-label";
    lbl.textContent = label;

    const bar = document.createElement("div");
    bar.className = "heatmap-bar";
    bar.style.width = `${(count / max) * 100}%`;

    row.appendChild(lbl);
    row.appendChild(bar);
    pingHeatmap.appendChild(row);
  }
}

/* ============================
   JSON BUTTONS
============================ */
document.getElementById("playersJson").onclick = () => {
  jsonOutput.style.display = "block";
  jsonOutput.textContent = JSON.stringify(lastData?.Data?.players || {}, null, 2);
};

document.getElementById("infoJson").onclick = () => {
  jsonOutput.style.display = "block";
  jsonOutput.textContent = JSON.stringify(lastData?.Data || {}, null, 2);
};

/* ============================
   FULL PANEL LOGIC
============================ */
const fullPanel = document.getElementById("fullPanel");
const overlay = document.getElementById("overlay");
const openFullPanel = document.getElementById("openFullPanel");
const closePanel = document.getElementById("closePanel");
const fullPlayers = document.getElementById("fullPlayers");
const fullResources = document.getElementById("fullResources");

openFullPanel.onclick = () => {
  if (!lastData) return alert("Run a lookup first.");

  const d = lastData.Data;

  renderFullPlayers(d.players);
  renderFullResources(d.resources);

  fullPanel.classList.add("open");
  overlay.classList.add("show");
};

closePanel.onclick = () => {
  fullPanel.classList.remove("open");
  overlay.classList.remove("show");
};

overlay.onclick = () => {
  fullPanel.classList.remove("open");
  overlay.classList.remove("show");
};

/* ============================
   PLAYER SEARCH
============================ */
const playerSearch = document.getElementById("playerSearch");

function renderFullPlayers(players) {
  let html = "<ul>";
  players.forEach(p => {
    let pingClass =
      p.ping <= 60 ? "ping-good" :
      p.ping <= 120 ? "ping-mid" :
      "ping-bad";

    html += `
      <li>
        <span class="player-id">[${p.id}]</span>
        <span class="player-name">${escapeHTML(p.name)}</span>
        <span class="player-ping ${pingClass}">${p.ping}ms</span>
      </li>
    `;
  });
  html += "</ul>";
  fullPlayers.innerHTML = html;

  playerSearch.oninput = () => {
    const q = playerSearch.value.toLowerCase();
    const filtered = players.filter(p =>
      p.name.toLowerCase().includes(q) ||
      String(p.id).includes(q) ||
      String(p.ping).includes(q)
    );
    renderFullPlayers(filtered);
  };
}

/* ============================
   RESOURCE SEARCH + SORT
============================ */
const resourceSearch = document.getElementById("resourceSearch");
const resourceSort = document.getElementById("resourceSort");

function renderFullResources(resources) {
  let html = "<ul>";
  resources.forEach(r => {
    html += `<li>${escapeHTML(r)}</li>`;
  });
  html += "</ul>";
  fullResources.innerHTML = html;

  resourceSearch.oninput = () => {
    const q = resourceSearch.value.toLowerCase();
    const filtered = resources.filter(r => r.toLowerCase().includes(q));
    renderFullResources(filtered);
  };

  resourceSort.onclick = () => {
    const sorted = [...resources].sort();
    renderFullResources(sorted);
  };
}

/* ============================
   AUTO REFRESH
============================ */
autoRefreshSelect.onchange = () => {
  if (refreshInterval) clearInterval(refreshInterval);

  const ms = Number(autoRefreshSelect.value);
  if (ms === 0) return;

  refreshInterval = setInterval(() => analyze(true), ms);
};

/* ============================
   INIT
============================ */
clearRecent.onclick = () => {
  localStorage.removeItem("recentLookups");
  renderRecent();
};

renderRecent();
analyzeBtn.onclick = () => analyze(false);
