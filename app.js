// Load server info
async function loadServer() {
  const cfx = "o9kk7r"; // Replace with your dynamic ID if needed
  const url = `https://servers-frontend.fivem.net/api/servers/single/${cfx}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const d = data.Data;

    // Banner
    if (d.vars?.banner_detail) {
      document.getElementById("serverBanner").src = d.vars.banner_detail;
    }

    // Server name
    document.getElementById("serverName").textContent = d.hostname;

    // Status
    document.getElementById("serverStatus").textContent = d.online ? "Online" : "Offline";

    // IP
    const ipFull = d.connectEndPoints?.[0] || "Unknown";
    const ipEl = document.getElementById("ipEl");
    ipEl.textContent = `IP: ${ipFull}`;
    ipEl.onclick = () => navigator.clipboard.writeText(ipFull);

    // Stats
    document.getElementById("statPlayers").textContent = `${d.clients} / ${d.sv_maxclients}`;
    document.getElementById("statResources").textContent = d.resources.length;
    document.getElementById("statBuild").textContent = d.vars?.sv_enforceGameBuild || "Unknown";

    // Locale (GeoIP)
    const ip = ipFull.split(":")[0];
    if (ip && ip !== "Unknown") {
      document.getElementById("statLocale").textContent = await fetchGeoIP(ip);
    }

    // Buttons
    document.getElementById("copyIP").onclick = () => navigator.clipboard.writeText(ipFull);
    document.getElementById("copyCFX").onclick = () => navigator.clipboard.writeText(cfx);
    document.getElementById("openFiveM").onclick = () => window.location.href = `fivem://connect/${ipFull}`;
    document.getElementById("openDiscord").onclick = () => window.open(d.vars?.Discord || "#", "_blank");
    document.getElementById("openWebsite").onclick = () => window.open(d.vars?.Website || "#", "_blank");

    // JSON buttons
    document.getElementById("playersJSON").onclick = () =>
      window.open(`https://servers-frontend.fivem.net/api/servers/single/${cfx}/players`, "_blank");

    document.getElementById("serverJSON").onclick = () =>
      window.open(url, "_blank");

  } catch (err) {
    console.error("Error loading server:", err);
  }
}

// GeoIP lookup
async function fetchGeoIP(ip) {
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await res.json();

    const country = data.country_name || "Unknown";
    const code = data.country || null;

    const flag = code
      ? String.fromCodePoint(...[...code.toUpperCase()].map(c => 127397 + c.charCodeAt()))
      : "";

    return `${country} ${flag}`;
  } catch {
    return "Unknown";
  }
}

// Run on load
loadServer();
