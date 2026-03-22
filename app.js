/* ============================================================
   GLOBALS
============================================================ */

let autoRefreshTimer = null;

/* ============================================================
   PAGE DETECTION
============================================================ */

const path = window.location.pathname.toLowerCase();
const isHome =
  path.endsWith("/") ||
  path.endsWith("/index.html") ||
  path.includes("index");
const isServer = path.includes("server");

/* ============================================================
   HOMEPAGE LOGIC
============================================================ */

if (isHome) {
  const input = document.getElementById("cfxInput");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const clearRecent = document.getElementById("clearRecent");

  loadRecentLookups();

  analyzeBtn.onclick = () => handleAnalyze();
  input.addEventListener("keypress", e => {
    if (e.key === "Enter") handleAnalyze();
  });

  clearRecent.onclick = () => {
    localStorage.removeItem("recentCFX");
    document.getElementById("recentList").innerHTML = "";
    document.getElementById("recentLookups").style.display = "none";
  };
}

function handleAnalyze() {
  const input = document.getElementById("cfxInput").value.trim();
  if (!input) return;

  const code = extractCFX(input);
  if (!code) {
    alert("No valid CFX code found.");
    return;
  }

  saveRecentLookup(code);
  window.location.href = `server.html?code=${code}`;
}

function extractCFX(str) {
  const match = str.match(/[a-zA-Z0-9]{6}/);
  return match ? match[0] : null;
}

function saveRecentLookup(code) {
  let list = JSON.parse(localStorage.getItem("recentCFX") || "[]");
  list = [code, ...list.filter(x => x !== code)].slice(0, 10);
  localStorage.setItem("recentCFX", JSON.stringify(list));
  loadRecentLookups();
}

function loadRecentLookups() {
  const list = JSON.parse(localStorage.getItem("recentCFX") || "[]");
  const container = document.getElementById("recentList");
  const wrapper = document.getElementById("recentLookups");

  container.innerHTML = "";

  if (list.length === 0) {
    wrapper.style.display = "none";
    return;
  }

  wrapper.style.display = "block";

  list.forEach(code => {
    const tag = document.createElement("div");
    tag.className = "recent-tag glass";
    tag.textContent = code;
    tag.onclick = () => window.location.href = `server.html?code=${code}`;
    container.appendChild(tag);
  });
}

/* ============================================================
   SERVER PAGE LOGIC
============================================================ */

if (isServer) {
  const params = new URLSearchParams(window.location.search);
  const cfx = params.get("code");

  if (!cfx) {
    alert("No CFX code provided.");
  } else {
    loadServerInfo(cfx);
  }
}

async function loadServerInfo(cfx) {
  stopAutoRefresh();

  const url = `https://servers-frontend.fivem.net/api/servers/single/${cfx}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data || !data.Data) {
      alert("Invalid CFX code or server not found.");
      return;
    }

    const d = data.Data;
    const vars = d.vars || {};

    /* ------------------------------
       ONLINE STATUS (FIXED)
    ------------------------------ */
    const isOnline = (d.clients > 0) || d.online;

    document.getElementById("serverStatusText").textContent =
      isOnline ? "Online" : "Offline";

    document.getElementById("serverStatusDot").style.background =
      isOnline ? "#00d26a" : "#ff4d4d";

    /* ------------------------------
       BASIC INFO
    ------------------------------ */
    document.getElementById("serverName").textContent = d.hostname || "Unknown";
    document.getElementById("serverIP").textContent =
      d.connectEndPoints?.[0] || "Unknown";

    /* ------------------------------
       BANNER
    ------------------------------ */
    if (vars.banner_detail) {
      document.getElementById("serverBanner").src = vars.banner_detail;
      document.getElementById("serverBannerWrap").style.display = "block";
    } else {
      document.getElementById("serverBannerWrap").style.display = "none";
    }

    /* ------------------------------
       STATS
    ------------------------------ */
    document.getElementById("statPlayers").textContent =
      `${d.clients || 0} / ${d.sv_maxclients || 0}`;

    document.getElementById("statResources").textContent =
      Array.isArray(d.resources) ? d.resources.length : 0;

    document.getElementById("statBuild").textContent =
      vars.sv_enforceGameBuild || "Unknown";

    /* ------------------------------
       GEOIP (SAFE)
    ------------------------------ */
    const ip = (d.connectEndPoints?.[0] || "").split(":")[0];

    document.getElementById("statLocale").textContent =
      ip ? await fetchGeoIP(ip) : "Unknown";

    /* ------------------------------
       DESCRIPTION + LOCATION + COUNTRY (SAFE)
    ------------------------------ */
    document.getElementById("serverDesc").textContent =
      vars.sv_projectDesc || "";

    document.getElementById("serverLoc").textContent =
      vars.locale || vars.sv_locale || vars.language || "";

    document.getElementById("serverCountry").textContent =
      vars.country || "Unknown";

    /* ------------------------------
       JSON BUTTONS
    ------------------------------ */
    document.getElementById("playersJson").onclick = () =>
      window.open(
        `https://servers-frontend.fivem.net/api/servers/single/${cfx}/players`,
        "_blank"
      );

    document.getElementById("infoJson").onclick = () =>
      window.open(url, "_blank");

    /* ------------------------------
       FULL PANEL BUTTON (NOW ALWAYS WORKS)
    ------------------------------ */
    document.getElementById("openFullPanel").onclick = () =>
      openFullPanel(d);

    /* ------------------------------
       AUTO REFRESH
    ------------------------------ */
    setupAutoRefresh(cfx);

  } catch (err) {
    console.error("Server load error:", err);
    alert("Failed to load server info.");
  }
}

/* ============================================================
   AUTO REFRESH
============================================================ */

function setupAutoRefresh(cfx) {
  const select = document.getElementById("autoRefreshSelect");

  if (!select) return;

  select.onchange = () => {
    stopAutoRefresh();
    const interval = parseInt(select.value);
    if (interval > 0) {
      autoRefreshTimer = setInterval(() => {
        loadServerInfo(cfx);
      }, interval);
    }
  };
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

/* ============================================================
   FULL PANEL
============================================================ */

function openFullPanel(data) {
  document.getElementById("overlay").style.display = "block";
  document.getElementById("fullPanel").style.display = "block";

  loadFullPlayers(Array.isArray(data.players) ? data.players : []);
  loadFullResources(Array.isArray(data.resources) ? data.resources : []);

  document.getElementById("closePanel").onclick = closeFullPanel;
}

function closeFullPanel() {
  document.getElementById("overlay").style.display = "none";
  document.getElementById("fullPanel").style.display = "none";
}

function loadFullPlayers(players) {
  const container = document.getElementById("fullPlayers");
  container.innerHTML = "";

  players.forEach(p => {
    const div = document.createElement("div");
    div.className = "player-row glass";
    div.textContent = `${p.name} (ID: ${p.id}) — Ping: ${p.ping}`;
    container.appendChild(div);
  });
}

function loadFullResources(resources) {
  const container = document.getElementById("fullResources");
  container.innerHTML = "";

  resources.forEach(r => {
    const div = document.createElement("div");
    div.className = "resource-row glass";
    div.textContent = r;
    container.appendChild(div);
  });

  document.getElementById("resourceSort").onclick = () => {
    const sorted = [...resources].sort();
    loadFullResources(sorted);
  };
}

/* ============================================================
   GEOIP
============================================================ */

async function fetchGeoIP(ip) {
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await res.json();

    const flag = data.country
      ? String.fromCodePoint(
          ...[...data.country].map(c => 127397 + c.charCodeAt())
        )
      : "";

    return `${data.country_name || "Unknown"} ${flag}`;
  } catch {
    return "Unknown";
  }
}
