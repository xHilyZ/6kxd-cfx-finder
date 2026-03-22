// CHANGE THIS TO ANY CFX CODE YOU WANT TO LOAD
const CFX_CODE = "o9kk7r";

// Load server info on page load
window.addEventListener("DOMContentLoaded", () => {
  loadServer(CFX_CODE);
});

// Fetch and populate server data
async function loadServer(cfx) {
  const url = `https://servers-frontend.fivem.net/api/servers/single/${cfx}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data || !data.Data) {
      console.error("Invalid server data:", data);
      return;
    }

    const d = data.Data;

    // Banner
    if (d.vars && d.vars.banner_detail) {
      document.getElementById("serverBanner").src = d.vars.banner_detail;
    }

    // Server name
    document.getElementById("serverName").textContent = d.hostname || "Unknown Server";

    // Status
    document.getElementById("serverStatus").textContent = d.online ? "Online" : "Offline";

    // IP
    const ipFull = (d.connectEndPoints && d.connectEndPoints[0]) || "Unknown";
    const ipEl = document.getElementById("ipEl");
    ipEl.textContent = `IP: ${ipFull}`;
    ipEl.onclick = () => {
      if (ipFull !== "Unknown") navigator.clipboard.writeText(ipFull);
    };

    // Stats
    document.getElementById("statPlayers").textContent =
      `${d.clients || 0} / ${d.sv_maxclients || 0}`;

    document.getElementById("statResources").textContent =
      d.resources ? d.resources.length : 0;

    document.getElementById("statBuild").textContent =
      (d.vars && d.vars.sv_enforceGameBuild) || "Unknown";

    // Locale (GeoIP)
    const ip = ipFull.split(":")[0];
    if (ip && ip !== "Unknown") {
      document.getElementById("statLocale").textContent = await fetchGeoIP(ip);
    } else {
      document.getElementById("statLocale").textContent = "Unknown";
    }

    // Buttons
    wireButtons({ ipFull, cfx, d, url });

  } catch (err) {
    console.error("Error loading server:", err);
  }
}

// Wire up all button actions
function wireButtons({ ipFull, cfx, d, url }) {
  document.getElementById("copyIP").onclick = () => {
    if (ipFull !== "Unknown") navigator.clipboard.writeText(ipFull);
  };

  document.getElementById("copyCFX").onclick = () =>
    navigator.clipboard.writeText(cfx);

  document.getElementById("openFiveM").onclick = () => {
    if (ipFull !== "Unknown") window.location.href = `fivem://connect/${ipFull}`;
  };

  document.getElementById("openDiscord").onclick = () => {
    if (d.vars?.Discord) window.open(d.vars.Discord, "_blank");
  };

  document.getElementById("openWebsite").onclick = () => {
    if (d.vars?.Website) window.open(d.vars.Website, "_blank");
  };

  document.getElementById("playersJSON").onclick = () =>
    window.open(
      `https://servers-frontend.fivem.net/api/servers/single/${cfx}/players`,
      "_blank"
    );

  document.getElementById("serverJSON").onclick = () =>
    window.open(url, "_blank");
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
