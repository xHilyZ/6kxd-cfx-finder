const input = document.getElementById("cfxInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const serverInfo = document.getElementById("serverInfo");
const playersDiv = document.getElementById("players");
const resourcesDiv = document.getElementById("resources");
const jsonOutput = document.getElementById("jsonOutput");
const jsonButtons = document.getElementById("jsonButtons");
const greeting = document.getElementById("greeting");

let lastData = null;

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

function normalize(code) {
  return code.replace("https://cfx.re/join/", "").trim();
}

async function fetchServer(code) {
  const url = `${window.location.origin}/api/resolve?code=${code}`;
  const res = await fetch(url);

  if (!res.ok) throw new Error("Invalid CFX code");

  return res.json();
}

async function analyze() {
  const raw = input.value.trim();
  if (!raw) return alert("Enter a CFX code");

  const code = normalize(raw);

  greeting.style.display = "none";
  serverInfo.style.display = "block";

  // Proper loading state
  serverInfo.style.opacity = "0.4";
  document.getElementById("serverName").textContent = "Loading...";
  document.getElementById("serverIP").textContent = "";
  document.getElementById("statPlayers").textContent = "";
  document.getElementById("statResources").textContent = "";
  document.getElementById("statBuild").textContent = "";
  document.getElementById("statLocale").textContent = "";
  document.getElementById("serverDesc").textContent = "";
  document.getElementById("serverLoc").textContent = "";

  playersDiv.style.display = "none";
  resourcesDiv.style.display = "none";
  jsonButtons.style.display = "none";
  document.getElementById("openFullPanel").style.display = "none";
  jsonOutput.style.display = "none";

  try {
    const data = await fetchServer(code);
    lastData = data;

    renderServer(data);
    renderPlayers(data.Data.players);
    renderResources(data.Data.resources);

    playersDiv.style.display = "block";
    resourcesDiv.style.display = "block";
    jsonButtons.style.display = "flex";
    document.getElementById("openFullPanel").style.display = "block";

  } catch (err) {
    console.error(err);
    document.getElementById("serverName").textContent = "Failed to fetch server data.";
  }
}

function renderServer(data) {
  const d = data.Data;

  const nameEl = document.getElementById("serverName");
  const ipEl = document.getElementById("serverIP");
  const playersEl = document.getElementById("statPlayers");
  const resourcesEl = document.getElementById("statResources");
  const buildEl = document.getElementById("statBuild");
  const localeEl = document.getElementById("statLocale");
  const descEl = document.getElementById("serverDesc");
  const locEl = document.getElementById("serverLoc");

  // Server logo (banner_detail)
  const iconEl = document.querySelector(".server-icon");

  if (d.vars?.banner_detail) {
    iconEl.style.backgroundImage = `url(${d.vars.banner_detail})`;
  } else {
    iconEl.style.backgroundImage = "url('https://via.placeholder.com/110x110/1e293b/ffffff?text=No+Logo')";
  }

  nameEl.textContent = escapeHTML(cleanName(d.hostname));
  ipEl.textContent = `IP: ${d.connectEndPoints?.[0] || "Unknown"}`;

  playersEl.textContent = `${d.clients} / ${d.sv_maxclients}`;
  resourcesEl.textContent = d.resources.length;
  buildEl.textContent = d.vars?.sv_enforceGameBuild || "Unknown";
  localeEl.textContent = d.locale || "Unknown";

  descEl.textContent = escapeHTML(d.vars?.sv_projectDesc || "No description");
  locEl.textContent = "Location info unavailable.";

  serverInfo.style.opacity = "1";
}

function renderPlayers(players) {
  playersDiv.innerHTML = `
    <h3>Players</h3>
    <p>${players.length} players online</p>
  `;
}

function renderResources(resources) {
  resourcesDiv.innerHTML = `
    <h3>Resources</h3>
    <p>${resources.length} resources loaded</p>
  `;
}

document.getElementById("playersJson").onclick = () => {
  jsonOutput.style.display = "block";
  jsonOutput.textContent = JSON.stringify(lastData?.Data?.players || {}, null, 2);
};

document.getElementById("infoJson").onclick = () => {
  jsonOutput.style.display = "block";
  jsonOutput.textContent = JSON.stringify(lastData?.Data || {}, null, 2);
};

analyzeBtn.onclick = analyze;

/* FULL PANEL LOGIC */
const fullPanel = document.getElementById("fullPanel");
const overlay = document.getElementById("overlay");
const openFullPanel = document.getElementById("openFullPanel");
const closePanel = document.getElementById("closePanel");
const fullPlayers = document.getElementById("fullPlayers");
const fullResources = document.getElementById("fullResources");

openFullPanel.onclick = () => {
  if (!lastData) return alert("Run a lookup first.");

  const d = lastData.Data;

  let pHtml = "<ul>";
  d.players.forEach(p => {

    let pingClass =
      p.ping <= 60 ? "ping-good" :
      p.ping <= 120 ? "ping-mid" :
      "ping-bad";

    pHtml += `
      <li>
        <span class="player-id">[${p.id}]</span>
        <span class="player-name">${escapeHTML(p.name)}</span>
        <span class="player-ping ${pingClass}">${p.ping}ms</span>
      </li>
    `;
  });
  pHtml += "</ul>";
  fullPlayers.innerHTML = pHtml;

  let rHtml = "<ul>";
  d.resources.forEach(r => {
    rHtml += `<li>${escapeHTML(r)}</li>`;
  });
  rHtml += "</ul>";
  fullResources.innerHTML = rHtml;

  fullPanel.classList.add("open");
  overlay.classList.add("show");
};

closePanel.onclick = () => {
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
