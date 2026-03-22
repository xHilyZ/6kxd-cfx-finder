// ===============================
// GLOBAL STATE
// ===============================
let fullPlayers = [];
let fullResources = [];
let sortAZ = false;

// ===============================
// STATUS BAR
// ===============================
function setStatus(state) {
  const dot = document.getElementById("statusDot");
  const text = document.getElementById("statusText");

  dot.className = "status-dot";

  if (state === "loading") {
    dot.classList.add("status-loading");
    text.textContent = "Fetching server info...";
  } else if (state === "online") {
    dot.classList.add("status-online");
    text.textContent = "Server online";
  } else {
    dot.classList.add("status-offline");
    text.textContent = "Server offline / unreachable";
  }
}

// ===============================
// PLAYER CARD RENDERING
// ===============================
function renderPlayerCards(players) {
  const listContainer = document.getElementById("fullPlayers");
  listContainer.innerHTML = "";
  fullPlayers = players;

  players.forEach(p => {
    const pingClass =
      p.ping < 80 ? "ping-green" :
      p.ping < 150 ? "ping-yellow" :
      "ping-red";

    listContainer.innerHTML += `
      <div class="player-card">
        <div class="player-avatar">${p.name.charAt(0).toUpperCase()}</div>
        <div>
          <div>${p.name}</div>
          <small>ID: ${p.id}</small>
        </div>
        <div class="ping-indicator ${pingClass}" style="margin-left:auto"></div>
      </div>
    `;
  });
}

// ===============================
// RESOURCE CHIP RENDERING
// ===============================
function renderResourceChips(resources) {
  const listContainer = document.getElementById("fullResources");
  listContainer.innerHTML = "";
  fullResources = resources;

  resources.forEach(r => {
    listContainer.innerHTML += `<span class="resource-chip">${r}</span>`;
  });
}

// ===============================
// FULL PANEL OPEN/CLOSE
// ===============================
document.getElementById("openFullPanel").addEventListener("click", () => {
  document.getElementById("overlay").classList.add("show");
  document.getElementById("fullPanel").classList.add("open");
});

document.getElementById("closePanel").addEventListener("click", () => {
  document.getElementById("overlay").classList.remove("show");
  document.getElementById("fullPanel").classList.remove("open");
});

// ===============================
// SERVER NAME SEARCH (AU ONLY)
// ===============================
const nameInput = document.getElementById("globalSearchInput");
const nameSearchBtn = document.getElementById("globalSearchBtn");

const AU_IPS = [
  "139.99.", "103.212.", "51.79.", "54.206.",
  "43.229.", "103.1.", "45.248."
];

nameSearchBtn.addEventListener("click", searchServerByName);
nameInput.addEventListener("keypress", e => {
  if (e.key === "Enter") searchServerByName();
});

async function searchServerByName() {
  const term = nameInput.value.trim().toLowerCase();
  if (term.length < 2) return;

  setStatus("loading");

  try {
    const res = await fetch(`https://servers-frontend.fivem.net/api/servers/search?q=${term}`);
    const json = await res.json();

    const auServers = json.filter(s => {
      const endpoints = s.Data?.connectEndPoints || [];
      return endpoints.some(ip => AU_IPS.some(prefix => ip.startsWith(prefix)));
    });

    if (auServers.length === 0) {
      setStatus("offline");
      document.getElementById("statusText").textContent = "No AU servers found";
      return;
    }

    const best = auServers.sort((a, b) =>
      (b.Data.players?.length || 0) - (a.Data.players?.length || 0)
    )[0];

    // ⭐ FIX: Validate CFX code before loading
    if (!best.EndPoint || best.EndPoint.length < 6) {
      setStatus("offline");
      document.getElementById("statusText").textContent = "Server not publicly listed";
      return;
    }

    document.getElementById("cfxInput").value = best.EndPoint;
    analyzeCFX();

  } catch (err) {
    console.error("Search failed", err);
    setStatus("offline");
  }
}

// ===============================
// MAIN FETCH FUNCTION
// ===============================
async function analyzeCFX() {
  const input = document.getElementById("cfxInput").value.trim();
  if (!input) return;

  setStatus("loading");

  const codeMatch = input.match(/[a-zA-Z0-9]{6,}/);
  if (!codeMatch) {
    setStatus("offline");
    return;
  }

  const code = codeMatch[0];

  try {
    const res = await fetch(`https://servers-frontend.fivem.net/api/servers/single/${code}`);
    const data = await res.json();
    const d = data.Data;

    const isRestarting =
      d && !d.online &&
      (!d.connectEndPoints || d.connectEndPoints.length === 0);

    if (isRestarting) {
      setStatus("offline");
      document.getElementById("statusText").textContent = "Server restarting";
      return;
    }

    document.getElementById("serverName").textContent = d.hostname;
    setStatus("online");

    document.getElementById("serverIP").textContent =
      d.connectEndPoints?.[0] || "Hidden";

    if (d.banner_connecting || d.banner_detail || d.icon) {
      document.getElementById("serverBannerWrap").style.display = "block";
      document.getElementById("serverBanner").src =
        d.banner_connecting || d.banner_detail || d.icon;
    }

    document.getElementById("statBuild").textContent = d.server;
    document.getElementById("statLocale").textContent = d.locale;

    renderPlayerCards(d.players || []);
    renderResourceChips(d.resources || []);

    document.getElementById("serverInfo").style.display = "block";

  } catch (err) {
    console.error(err);
    setStatus("offline");
  }
}

// ===============================
// BUTTON LISTENER
// ===============================
document.getElementById("analyzeBtn").addEventListener("click", analyzeCFX);
document.getElementById("cfxInput").addEventListener("keypress", e => {
  if (e.key === "Enter") analyzeCFX();
});
