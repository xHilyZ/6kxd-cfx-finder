// ===============================
// GLOBAL STATE
// ===============================
let fullPlayers = [];
let fullResources = [];
let sortAZ = false;

let allServers = []; // for global search

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
  const statPlayers = document.getElementById("statPlayers");

  statPlayers.textContent = players.length;
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
  const statResources = document.getElementById("statResources");
  const listContainer = document.getElementById("fullResources");

  statResources.textContent = resources.length;
  listContainer.innerHTML = "";
  fullResources = resources;

  resources.forEach(r => {
    listContainer.innerHTML += `<span class="resource-chip">${r}</span>`;
  });
}

// ===============================
// FULL PANEL OPEN/CLOSE
// ===============================
const overlay = document.getElementById("overlay");
const fullPanel = document.getElementById("fullPanel");

document.getElementById("openFullPanel").addEventListener("click", () => {
  overlay.classList.add("show");
  fullPanel.classList.add("open");
});

document.getElementById("closePanel").addEventListener("click", () => {
  overlay.classList.remove("show");
  fullPanel.classList.remove("open");
});

// ===============================
// SEARCH FILTERS
// ===============================
document.getElementById("playerSearch").addEventListener("input", e => {
  const term = e.target.value.toLowerCase();
  const list = document.getElementById("fullPlayers");

  list.innerHTML = "";

  fullPlayers
    .filter(p =>
      p.name.toLowerCase().includes(term) ||
      String(p.id).includes(term) ||
      String(p.ping).includes(term)
    )
    .forEach(p => {
      const pingClass =
        p.ping < 80 ? "ping-good" :
        p.ping < 150 ? "ping-mid" :
        "ping-bad";

      list.innerHTML += `
        <li>
          <span class="player-id">${p.id}</span>
          <span class="player-name">${p.name}</span>
          <span class="player-ping ${pingClass}">${p.ping}ms</span>
        </li>
      `;
    });
});

document.getElementById("resourceSearch").addEventListener("input", e => {
  const term = e.target.value.toLowerCase();
  const list = document.getElementById("fullResources");

  list.innerHTML = "";

  fullResources
    .filter(r => r.toLowerCase().includes(term))
    .forEach(r => {
      list.innerHTML += `<li>${r}</li>`;
    });
});

document.getElementById("resourceSort").addEventListener("click", () => {
  sortAZ = !sortAZ;
  fullResources.sort((a, b) => sortAZ ? a.localeCompare(b) : b.localeCompare(a));
  renderResourceChips(fullResources);
});

// ===============================
// GLOBAL SERVER SEARCH (AU + NZ)
// ===============================
const globalInput = document.getElementById("globalSearchInput");
const serverBrowser = document.getElementById("serverBrowser");
const serverResults = document.getElementById("serverResults");

// Load servers using paginated API (3 pages)
async function loadAllServers() {
  try {
    let pages = [0, 1, 2]; // Option A: 3 pages
    let results = [];

    for (let p of pages) {
      const res = await fetch(`https://servers-frontend.fivem.net/api/servers/page/${p}`);
      const json = await res.json();
      results = results.concat(json);
    }

    allServers = results;
  } catch (err) {
    console.error("Failed to load server list", err);
  }
}

loadAllServers();

// Live search
globalInput.addEventListener("input", () => {
  const term = globalInput.value.toLowerCase();

  if (term.length < 2) {
    serverBrowser.style.display = "none";
    return;
  }

  const matches = allServers.filter(s => {
    const nameMatch = s.Data?.hostname?.toLowerCase().includes(term);

    const endpoints = s.Data?.connectEndPoints || [];

    const isAUNZ = endpoints.some(ip =>
      ip.startsWith("139.99.") ||   // AU
      ip.startsWith("103.212.") ||  // AU
      ip.startsWith("51.79.") ||    // AU
      ip.startsWith("54.206.") ||   // AU
      ip.startsWith("43.229.") ||   // AU
      ip.startsWith("103.1.") ||    // AU
      ip.startsWith("45.248.") ||   // AU
      ip.startsWith("103.254.") ||  // NZ
      ip.startsWith("103.16.") ||   // NZ
      ip.startsWith("103.26.") ||   // NZ
      ip.startsWith("103.50.")      // NZ
    );

    return nameMatch && isAUNZ;
  });

  serverResults.innerHTML = "";

  matches.slice(0, 25).forEach(s => {
    const icon = s.Data.icon || "";
    const name = s.Data.hostname || "Unknown";
    const players = s.Data.players?.length || 0;
    const code = s.EndPoint;

    serverResults.innerHTML += `
      <div class="server-row" data-code="${code}">
        <div class="server-row-icon" style="background-image:url('${icon}')"></div>
        <div class="server-row-name">${name}</div>
        <div class="server-row-players">${players} players</div>
      </div>
    `;
  });

  serverBrowser.style.display = "block";
});

// Click → load server
serverResults.addEventListener("click", e => {
  const row = e.target.closest(".server-row");
  if (!row) return;

  const code = row.dataset.code;

  document.getElementById("cfxInput").value = code;
  serverBrowser.style.display = "none";
  analyzeCFX();
});

// Hide when clicking outside
document.addEventListener("click", e => {
  if (!serverBrowser.contains(e.target) && e.target !== globalInput) {
    serverBrowser.style.display = "none";
  }
});

// ===============================
// MAIN FETCH FUNCTION
// ===============================
async function analyzeCFX() {
  const input = document.getElementById("cfxInput").value.trim();
  if (!input) return;

  setStatus("loading");
  document.getElementById("greeting").style.display = "none";

  const codeMatch = input.match(/[a-zA-Z0-9]{6,}/);
  if (!codeMatch) {
    setStatus("offline");
    return;
  }

  const code = codeMatch[0];

  try {
    const res = await fetch(`https://servers-frontend.fivem.net/api/servers/single/${code}`);
    if (!res.ok) throw new Error();

    const data = await res.json();
    const d = data.Data;

    // ===============================
    // RESTARTING SERVER DETECTION
    // ===============================
    const isRestarting =
      d &&
      !d.online &&
      (!d.connectEndPoints || d.connectEndPoints.length === 0) &&
      d.hostname;

    if (isRestarting) {
      setStatus("offline");
      document.getElementById("statusText").textContent = "Server restarting";

      document.getElementById("serverName").textContent = d.hostname;
      document.getElementById("serverIP").textContent = "Restarting...";

      let banner =
        d.banner_connecting ||
        d.banner_detail ||
        d.icon ||
        d.vars?.banner_connecting ||
        d.vars?.banner_detail ||
        null;

      if (banner) {
        document.getElementById("serverBannerWrap").style.display = "block";
        document.getElementById("serverBanner").src = banner;
      }

      document.getElementById("statBuild").textContent = d.server || "N/A";
      document.getElementById("statLocale").textContent = d.locale || "N/A";

      renderPlayerCards([]);
      renderResourceChips([]);

      document.getElementById("serverInfo").style.display = "flex";
      return;
    }

    // ===============================
    // NORMAL ONLINE SERVER
    // ===============================
    document.getElementById("serverName").textContent = d.hostname || "Unknown Server";
    setStatus("online");

    const ip = d.connectEndPoints?.[0] || "Hidden";
    document.getElementById("serverIP").textContent = `IP: ${ip}`;

    if (d.icon) {
      document.getElementById("serverIcon").style.backgroundImage = `url(${d.icon})`;
    }

    let banner =
      d.banner_connecting ||
      d.banner_detail ||
      d.icon ||
      d.vars?.banner_connecting ||
      d.vars?.banner_detail ||
      null;

    if (banner) {
      document.getElementById("serverBannerWrap").style.display = "block";
      document.getElementById("serverBanner").src = banner;
    } else {
      document.getElementById("serverBannerWrap").style.display = "none";
    }

    document.getElementById("statBuild").textContent = d.server || "N/A";
    document.getElementById("statLocale").textContent = d.locale || "N/A";

    renderPlayerCards(d.players || []);
    renderResourceChips(d.resources || []);

    document.getElementById("serverDesc").textContent = d.vars?.sv_projectDesc || "";
    document.getElementById("serverLoc").textContent = d.vars?.locale || "";

    if (d.vars?.country) {
      document.getElementById("serverCountry").textContent = `Country: ${d.vars.country}`;
    }

    document.getElementById("serverInfo").style.display = "flex";
    document.getElementById("openFullPanel").style.display = "block";

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
