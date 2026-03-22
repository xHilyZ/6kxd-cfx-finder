// ===============================
//  PREMIUM CFX FINDER LOGIC
// ===============================

const cfxInput = document.getElementById("cfxInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusText = document.getElementById("statusText");
const serverName = document.getElementById("serverName");
const serverPlayers = document.getElementById("serverPlayers");
const serverIcon = document.getElementById("serverIcon");
const serverBanner = document.getElementById("serverBanner");
const serverEndpoints = document.getElementById("serverEndpoints");
const serverResources = document.getElementById("serverResources");
const playersList = document.getElementById("playersList");
const historyList = document.getElementById("historyList");
const themeToggle = document.getElementById("themeToggle");
const joinBtn = document.getElementById("joinBtn");
const resultsPanel = document.getElementById("resultsPanel");

let currentCode = null;

// Status helper
function setStatus(type, message) {
    statusText.textContent = message;

    switch (type) {
        case "loading":
            statusText.style.color = "#4da3ff";
            break;
        case "online":
            statusText.style.color = "#4dff88";
            break;
        case "offline":
            statusText.style.color = "#ff4d6a";
            break;
        default:
            statusText.style.color = "var(--muted)";
    }
}

// Extract CFX code
function extractCFX(input) {
    if (!input) return null;
    if (input.includes("cfx.re/join/")) {
        return input.split("cfx.re/join/")[1].trim();
    }
    return input.trim();
}

// Shimmer helpers
function setLoadingState(isLoading) {
    const shimmerTargets = [
        serverName,
        serverPlayers,
        serverIcon,
        serverBanner,
        serverEndpoints,
        serverResources,
        playersList
    ];

    shimmerTargets.forEach(el => {
        if (!el) return;
        if (isLoading) {
            el.classList.add("loading", "shimmer");
        } else {
            el.classList.remove("loading");
        }
    });

    if (isLoading) {
        joinBtn.disabled = true;
    }
}

// History
function loadHistory() {
    const raw = localStorage.getItem("cfxHistory");
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function saveHistory(history) {
    localStorage.setItem("cfxHistory", JSON.stringify(history.slice(0, 10)));
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

    if (!history.length) {
        const li = document.createElement("li");
        li.textContent = "No recent lookups yet.";
        li.style.color = "var(--muted)";
        historyList.appendChild(li);
        return;
    }

    history.forEach(item => {
        const li = document.createElement("li");
        const codeSpan = document.createElement("span");
        codeSpan.className = "code";
        codeSpan.textContent = item.code;

        const nameSpan = document.createElement("span");
        nameSpan.textContent = item.name;

        li.appendChild(codeSpan);
        li.appendChild(nameSpan);

        li.addEventListener("click", () => {
            cfxInput.value = item.code;
            analyzeCFX();
        });

        historyList.appendChild(li);
    });
}

// Theme
function initTheme() {
    const saved = localStorage.getItem("cfxTheme");
    if (saved === "light") {
        document.body.classList.add("light");
        themeToggle.textContent = "Light";
    } else {
        document.body.classList.remove("light");
        themeToggle.textContent = "Dark";
    }
}

themeToggle.addEventListener("click", () => {
    const isLight = document.body.classList.toggle("light");
    localStorage.setItem("cfxTheme", isLight ? "light" : "dark");
    themeToggle.textContent = isLight ? "Light" : "Dark";
});

// Main lookup
async function analyzeCFX() {
    const raw = cfxInput.value.trim();
    const code = extractCFX(raw);

    if (!code || code.length < 4) {
        setStatus("offline", "Invalid CFX code");
        return;
    }

    currentCode = code;
    setStatus("loading", "Checking server…");
    setLoadingState(true);

    try {
        const res = await fetch(`https://servers-frontend.fivem.net/api/servers/single/${code}`);

        if (!res.ok) {
            setStatus("offline", "Server not found or offline");
            setLoadingState(false);
            return;
        }

        const data = await res.json();

        if (!data || !data.Data) {
            setStatus("offline", "Invalid or private server");
            setLoadingState(false);
            return;
        }

        const d = data.Data;

        // Status
        setStatus("online", "Server Online");

        // Name / players
        serverName.textContent = d.hostname || "Unknown";
        serverPlayers.textContent = `${d.players?.length || 0} players`;

        // Icon
        if (d.icon) {
            serverIcon.src = `data:image/png;base64,${d.icon}`;
            serverIcon.style.display = "block";
        } else {
            serverIcon.style.display = "none";
        }

        // Banner
        const bannerUrl =
            (d.vars && (d.vars.banner_connecting || d.vars.banner_detail)) || null;

        if (bannerUrl) {
            serverBanner.src = bannerUrl;
            serverBanner.style.display = "block";
        } else {
            serverBanner.style.display = "none";
        }

        // Endpoints
        serverEndpoints.innerHTML = "";
        (d.connectEndPoints || []).forEach(ip => {
            const li = document.createElement("li");
            li.textContent = ip;
            serverEndpoints.appendChild(li);
        });

        // Resources
        serverResources.innerHTML = "";
        if (Array.isArray(d.resources) && d.resources.length) {
            d.resources.slice(0, 30).forEach(r => {
                const li = document.createElement("li");
                li.textContent = r;
                serverResources.appendChild(li);
            });
        } else {
            const li = document.createElement("li");
            li.textContent = "No resources listed.";
            serverResources.appendChild(li);
        }

        // Players
        playersList.innerHTML = "";
        if (Array.isArray(d.players) && d.players.length) {
            d.players.forEach(p => {
                const row = document.createElement("div");
                row.className = "player-row";

                const left = document.createElement("span");
                left.textContent = p.name || `ID ${p.id}`;

                const right = document.createElement("span");
                right.className = "meta";
                right.textContent = `ID ${p.id} • ${p.ping}ms`;

                row.appendChild(left);
                row.appendChild(right);
                playersList.appendChild(row);
            });
        } else {
            const row = document.createElement("div");
            row.className = "player-row";
            row.textContent = "No players online.";
            playersList.appendChild(row);
        }

        // Join button
        joinBtn.disabled = false;
        joinBtn.onclick = () => {
            if (d.connectEndPoints && d.connectEndPoints.length) {
                const ip = d.connectEndPoints[0];
                window.location.href = `fivem://connect/${ip}`;
            } else {
                window.open(`https://cfx.re/join/${code}`, "_blank");
            }
        };

        // History
        addToHistory(code, d.hostname || "Unknown");

        // Slide panel slight lift
        resultsPanel.style.transform = "translateY(-4px)";
        setTimeout(() => {
            resultsPanel.style.transform = "translateY(0)";
        }, 220);

    } catch (err) {
        console.error(err);
        setStatus("offline", "Error contacting CFX API");
    } finally {
        setLoadingState(false);
    }
}

// Events
analyzeBtn.addEventListener("click", analyzeCFX);
cfxInput.addEventListener("keypress", e => {
    if (e.key === "Enter") analyzeCFX();
});

// Init
initTheme();
renderHistory();
setLoadingState(false);
