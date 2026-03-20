const input = document.getElementById("cfxInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const serverInfo = document.getElementById("serverInfo");
const playersDiv = document.getElementById("players");
const resourcesDiv = document.getElementById("resources");
const jsonOutput = document.getElementById("jsonOutput");
const limitBanner = document.getElementById("limitBanner");

let lookupCount = 0;
const DAILY_LIMIT = 3;
let lastData = null;

function normalize(code) {
  return code.replace("https://cfx.re/join/", "").trim();
}

async function fetchServer(code) {
  const url = `https://servers-frontend.fivem.net/api/servers/single/${code}`;
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

  serverInfo.innerHTML = "Loading...";
  playersDiv.innerHTML = "";
  resourcesDiv.innerHTML = "";
  jsonOutput.style.display = "none";

  try {
    const data = await fetchServer(code);
    lastData = data;

    renderServer(data);
    renderPlayers(data.Data.players);
    renderResources(data.Data.resources);
  } catch (err) {
    serverInfo.innerHTML = "Failed to fetch server data.";
  }
}

function renderServer(data) {
  serverInfo.innerHTML = `
    <h3>${data.Data.hostname}</h3>
    <p>Players: ${data.Data.clients} / ${data.Data.sv_maxclients}</p>
    <p>Tags: ${data.Data.tags}</p>
  `;
}

function renderPlayers(players) {
  if (!players || players.length === 0) {
    playersDiv.innerHTML = "<p>No players online.</p>";
    return;
  }

  let html = "<h3>Players</h3><ul>";
  players.forEach(p => {
    html += `<li>${p.name} (${p.id}) - ${p.ping}ms</li>`;
  });
  html += "</ul>";

  playersDiv.innerHTML = html;
}

function renderResources(resources) {
  if (!resources) return;

  let html = "<h3>Resources</h3><ul>";
  resources.forEach(r => {
    html += `<li>${r}</li>`;
  });
  html += "</ul>";

  resourcesDiv.innerHTML = html;
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
