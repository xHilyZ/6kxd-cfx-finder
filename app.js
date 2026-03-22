// ===============================
//  CFX CODE LOOKUP ONLY (FINAL)
// ===============================

// UI elements
const cfxInput = document.getElementById("cfxInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusText = document.getElementById("statusText");
const serverName = document.getElementById("serverName");
const serverPlayers = document.getElementById("serverPlayers");
const serverIcon = document.getElementById("serverIcon");
const serverEndpoints = document.getElementById("serverEndpoints");

// Set status helper
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
            statusText.style.color = "#ff4d4d";
            break;
        default:
            statusText.style.color = "#ffffff";
    }
}

// Extract CFX code from pasted link or raw input
function extractCFX(input) {
    if (!input) return null;

    // If user pastes a full link
    if (input.includes("cfx.re/join/")) {
        return input.split("cfx.re/join/")[1].trim();
    }

    // If user pastes just the code
    return input.trim();
}

// Main lookup function
async function analyzeCFX() {
    const raw = cfxInput.value.trim();
    const code = extractCFX(raw);

    if (!code || code.length < 4) {
        setStatus("offline", "Invalid CFX code");
        return;
    }

    setStatus("loading", "Checking server...");

    try {
        const res = await fetch(`https://servers-frontend.fivem.net/api/servers/single/${code}`);

        if (!res.ok) {
            setStatus("offline", "Server not found or offline");
            return;
        }

        const data = await res.json();

        if (!data || !data.Data) {
            setStatus("offline", "Invalid or private server");
            return;
        }

        // Update UI
        setStatus("online", "Server Online");

        serverName.textContent = data.Data.hostname || "Unknown";
        serverPlayers.textContent = `${data.Data.players?.length || 0} players`;

        // Icon
        if (data.Data.icon) {
            serverIcon.src = `data:image/png;base64,${data.Data.icon}`;
            serverIcon.style.display = "block";
        } else {
            serverIcon.style.display = "none";
        }

        // Endpoints
        serverEndpoints.innerHTML = "";
        (data.Data.connectEndPoints || []).forEach(ip => {
            const li = document.createElement("li");
            li.textContent = ip;
            serverEndpoints.appendChild(li);
        });

    } catch (err) {
        console.error(err);
        setStatus("offline", "Error contacting CFX API");
    }
}

// Button click
analyzeBtn.addEventListener("click", analyzeCFX);

// Enter key support
cfxInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") analyzeCFX();
});
