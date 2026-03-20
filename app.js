// ===============================
// GLOBALS
// ===============================
let lastServer = null;
let recentLookups = JSON.parse(localStorage.getItem("recentLookups") || "[]");

// ===============================
// MAIN FETCH FUNCTION
// ===============================
async function fetchServer(code) {
    if (!code) return;

    try {
        const res = await fetch(`https://servers-frontend.fivem.net/api/servers/single/${code}`);
        const data = await res.json();

        if (!data || !data.data) {
            showError("Server not found.");
            return;
        }

        lastServer = data;

        updateStats(data);
        updateDescription(data);
        updateLocation(data);
        updateControlCenter(data); // ⭐ NEW FEATURE
        updateRecent(code);

        loadPlayers(data);
        loadResources(data);
        loadPingHeatmap(data);

    } catch (err) {
        console.error(err);
        showError("Failed to fetch server.");
    }
}

// ===============================
// UPDATE STATS
// ===============================
function updateStats(data) {
    document.getElementById("statPlayers").textContent =
        `${data.data.clients} / ${data.data.sv_maxclients}`;

    document.getElementById("statResources").textContent =
        data.data.resources?.length || 0;

    document.getElementById("statBuild").textContent =
        data.data.vars?.sv_enforceGameBuild || "Unknown";

    document.getElementById("statLocale").textContent =
        data.data.vars?.locale || "Unknown";
}

// ===============================
// UPDATE DESCRIPTION
// ===============================
function updateDescription(data) {
    document.getElementById("serverDesc").textContent =
        data.data.vars?.sv_projectDesc || "";
}

// ===============================
// UPDATE LOCATION (GeoIP)
// ===============================
function updateLocation(data) {
    const loc = data.data.vars?.locale || "Unknown";
    document.getElementById("serverLoc").textContent = `Locale: ${loc}`;
}

// ===============================
// ⭐ CONTROL CENTER LOGIC
// ===============================
function updateControlCenter(data) {
    const ip = data?.data?.connectEndPoints?.[0] || null;
    const cfx = data?.code || null;
    const discord = data?.data?.vars?.Discord || null;
    const website = data?.data?.vars?.Website || null;

    // Copy IP
    const btnIP = document.getElementById("copyIP");
    btnIP.onclick = () => ip && navigator.clipboard.writeText(ip);
    btnIP.style.display = ip ? "block" : "none";

    // Copy CFX
    const btnCFX = document.getElementById("copyCFX");
    btnCFX.onclick = () => cfx && navigator.clipboard.writeText(cfx);

    // Open in FiveM
    const btnFiveM = document.getElementById("openFiveM");
    btnFiveM.onclick = () => ip && (window.location.href = `fivem://connect/${ip}`);
    btnFiveM.style.display = ip ? "block" : "none";

    // Discord
    const btnDiscord = document.getElementById("openDiscord");
    btnDiscord.onclick = () => discord && window.open(discord, "_blank");
    btnDiscord.style.display = discord ? "block" : "none";

    // Website
    const btnWebsite = document.getElementById("openWebsite");
    btnWebsite.onclick = () => website && window.open(website, "_blank");
    btnWebsite.style.display = website ? "block" : "none";
}

// ===============================
// RECENT LOOKUPS
// ===============================
function updateRecent(code) {
    if (!recentLookups.includes(code)) {
        recentLookups.unshift(code);
        if (recentLookups.length > 8) recentLookups.pop();
        localStorage.setItem("recentLookups", JSON.stringify(recentLookups));
    }
    renderRecent();
}

function renderRecent() {
    const container = document.getElementById("recentList");
    if (!container) return;

    container.innerHTML = "";
    recentLookups.forEach(code => {
        const item = document.createElement("div");
        item.className = "recent-item";
        item.textContent = code;
        item.onclick = () => fetchServer(code);
        container.appendChild(item);
    });
}

// ===============================
// PLAYERS PANEL
// ===============================
function loadPlayers(data) {
    const list = document.getElementById("fullPlayersList");
    if (!list) return;

    list.innerHTML = "";

    (data.data.players || []).forEach(p => {
        const li = document.createElement("li");
        li.innerHTML = `
            <span class="player-id">${p.id}</span>
            <span class="player-name">${p.name}</span>
            <span class="player-ping ${pingClass(p.ping)}">${p.ping}ms</span>
        `;
        list.appendChild(li);
    });
}

function pingClass(ping) {
    if (ping < 80) return "ping-good";
    if (ping < 150) return "ping-mid";
    return "ping-bad";
}

// ===============================
// RESOURCES PANEL
// ===============================
function loadResources(data) {
    const list = document.getElementById("fullResourcesList");
    if (!list) return;

    list.innerHTML = "";

    (data.data.resources || []).forEach(r => {
        const li = document.createElement("li");
        li.textContent = r;
        list.appendChild(li);
    });
}

// ===============================
// PING HEATMAP
// ===============================
function loadPingHeatmap(data) {
    const heatmap = document.getElementById("pingHeatmap");
    if (!heatmap) return;

    heatmap.innerHTML = "";

    (data.data.players || []).forEach(p => {
        const row = document.createElement("div");
        row.className = "heatmap-row";

        row.innerHTML = `
            <div class="heatmap-label">${p.name}</div>
            <div class="heatmap-bar" style="width:${Math.min(p.ping, 300)}px"></div>
        `;

        heatmap.appendChild(row);
    });
}

// ===============================
// ERROR HANDLING
// ===============================
function showError(msg) {
    document.getElementById("serverDesc").textContent = msg;
}

// ===============================
// SEARCH HANDLER
// ===============================
document.getElementById("lookupBtn").onclick = () => {
    const code = document.getElementById("serverInput").value.trim();
    fetchServer(code);
};

// Load recent on startup
renderRecent();
