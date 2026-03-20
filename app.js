const input = document.getElementById("cfxInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const serverInfo = document.getElementById("serverInfo");
const playersDiv = document.getElementById("players");
const resourcesDiv = document.getElementById("resources");
const jsonOutput = document.getElementById("jsonOutput");
const jsonButtons = document.getElementById("jsonButtons");
const greeting = document.getElementById("greeting");
const limitBanner = document.getElementById("limitBanner");

let lookupCount = 0;
const DAILY_LIMIT = 3;
let lastData = null;

function normalize(code) {
  return code.replace("https://cfx.re/join/", "").trim();
}

async function fetchServer(code) {
  const url = `/api/resolve?code=${code}`;
  const res = await fetch(url);

  if (!res.ok) throw new Error("Invalid CFX code");

  return res.json();
}

async function analyze() {
  const raw = input.value.trim();
  if (!raw) return alert("Enter a CFX code");

  if (lookupCount >= DAILY_LIMIT) {
    limitBanner.style.display = "block";
    return;
  }

  lookupCount++;

  const code = normalize(raw);

  greeting.style.display = "none";

  serverInfo.style.display = "block";
  serverInfo.innerHTML = "Loading...";

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
    serverInfo.innerHTML = "Failed to fetch server data.";
  }
}

function renderServer(data) {
  const d = data.Data;

  document.getElementById("serverName").textContent = d.hostname;
  document.getElementById("serverIP").textContent = `IP: ${d.connectEndPoints?.[0] || "Unknown"}`;

  document.getElementById("statPlayers").textContent = `${d.clients} / ${d.sv_maxclients}`;
  document.getElementById("statResources").textContent = d.resources.length;
  document.getElementById("statBuild").textContent = d.vars?.sv_enforceGameBuild || "Unknown";
  document.getElementById("statLocale").textContent = d.locale || "Unknown";

  document.getElementById("serverDesc").textContent = d.vars?.sv_projectDesc || "No description";
  document.getElementById("serverLoc").textContent = "Location info unavailable.";
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
    pHtml += `<li>[${p.id}] ${p.name} — ${p.ping}ms</li>`;
  });
  pHtml += "</ul>";
  fullPlayers.innerHTML = pHtml;

  let rHtml = "<ul>";
  d.resources.forEach(r => {
    rHtml += `<li>${r}</li>`;
  });
  rHtml += "</ul>";
  fullResources.innerHTML = rHtml;

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
