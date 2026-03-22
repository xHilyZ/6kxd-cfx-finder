document.addEventListener("DOMContentLoaded", () => {

/* ============================================================
   GLOBAL STATE
============================================================ */
let lastData = null;
let autoRefreshTimer = null;

/* ============================================================
   ELEMENTS
============================================================ */
const serverInfo = document.getElementById("serverInfo");
const serverBanner = document.getElementById("serverBanner");
const serverBannerWrap = document.getElementById("serverBannerWrap");

const nameEl = document.getElementById("serverName");
const ipEl = document.getElementById("serverIP");
const playersEl = document.getElementById("statPlayers");
const resourcesEl = document.getElementById("statResources");
const buildEl = document.getElementById("statBuild");
const localeEl = document.getElementById("statLocale");

const descEl = document.getElementById("serverDesc");
const locEl = document.getElementById("serverLoc");
const countryEl = document.getElementById("serverCountry");

const pingHeatmap = document.getElementById("pingHeatmap");
const jsonOutput = document.getElementById("jsonOutput");

/* ============================================================
   ESCAPE HTML
============================================================ */
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ============================================================
   CLEAN SERVER NAME
============================================================ */
function cleanName(name) {
  return name.replace(/\^[0-9]/g, "");
}

/* ============================================================
   FETCH SERVER INFO (CFX)
============================================================ */
async function fetchServer(code) {
  const url = `https://servers-frontend.fivem.net/api/servers/single/${code}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("CFX API error");
  return res.json();
}

/* ============================================================
   FETCH INTERNAL ENDPOINTS
============================================================ */
async function fetchInternal(ipPort) {
  const base = `http://${ipPort}`;

  let players = [];
  let resources = [];

  try {
    const p = await fetch(`${base}/players.json`);
    if (p.ok) players = await p.json();
  } catch {}

  try {
    const r = await fetch(`${base}/resources.json`);
    if (r.ok) resources = await r.json();
  } catch {}

  return { players, resources };
}

/* ============================================================
   MAIN LOAD FUNCTION
============================================================ */
async function loadServer(code) {
  try {
    const data = await fetchServer(code);
    lastData = data;

    const d = data.Data;

    /* ------------------------------
       BANNER
    ------------------------------ */
    if (d.vars?.banner_detail) {
      serverBanner.src = d.vars.banner_detail;
      serverBannerWrap.style.display = "block";
    } else {
      serverBannerWrap.style.display = "none";
    }

    /* ------------------------------
       BASIC INFO
    ------------------------------ */
    nameEl.textContent = escapeHTML(cleanName(d.hostname));
    ipEl.textContent = `IP: ${d.connectEndPoints?.[0] || "Unknown"}`;

    playersEl.textContent = `${d.clients} / ${d.sv_maxclients}`;
    resourcesEl.textContent = d.resources.length;
    buildEl.textContent = d.vars?.sv_enforceGameBuild || "Unknown";
    localeEl.textContent = d.locale || "Unknown";

    descEl.textContent = escapeHTML(d.vars?.sv_projectDesc || "No description");
    locEl.textContent = "Location info unavailable.";

    /* ------------------------------
       GEOIP
    ------------------------------ */
    const ip = d.connectEndPoints?.[0]?.split(":")[0];
    if (ip) {
      countryEl.textContent = await fetchGeoIP(ip);
    }

    serverInfo.style.opacity = "1";

    /* ------------------------------
       HEATMAP
    ------------------------------ */
    renderHeatmap(d.players);

  } catch (err) {
    alert("Failed to load server info.");
    console.error(err);
  }
}

/* ============================================================
   HEATMAP
============================================================ */
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

/* ============================================================
   JSON BUTTONS
============================================================ */
document.getElementById("playersJson").onclick = () => {
  jsonOutput.style.display = "block";
  jsonOutput.textContent = JSON.stringify(lastData?.Data?.players || {}, null, 2);
};

document.getElementById("infoJson").onclick = () => {
  jsonOutput.style.display = "block";
  jsonOutput.textContent = JSON.stringify(lastData?.Data || {}, null, 2);
};

/* ============================================================
   FULL PANEL LOGIC (INTERNAL ENDPOINTS)
============================================================ */
const fullPanel = document.getElementById("fullPanel");
const overlay = document.getElementById("overlay");
const openFullPanel = document.getElementById("openFullPanel");
const closePanel = document.getElementById("closePanel");
const fullPlayers = document.getElementById("fullPlayers");
const fullResources = document.getElementById("fullResources");

openFullPanel.onclick = async () => {
  if (!lastData) return alert("Run a lookup first.");

  const d = lastData.Data;
  const ipPort = d.connectEndPoints?.[0];

  if (!ipPort) {
    alert("Server IP unavailable.");
    return;
  }

  const { players, resources } = await fetchInternal(ipPort);

  if (!players.length) {
    fullPlayers.innerHTML =
      "<div class='player-row glass'>Player list hidden or unavailable.</div>";
  } else {
    renderFullPlayers(players);
  }

  if (!resources.length) {
    fullResources.innerHTML =
      "<div class='resource-row glass'>Resource list hidden or unavailable.</div>";
  } else {
    renderFullResources(resources);
  }

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

/* ============================================================
   PLAYER SEARCH
============================================================ */
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

/* ============================================================
   RESOURCE SEARCH + SORT
============================================================ */
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

}); // END DOMContentLoaded
