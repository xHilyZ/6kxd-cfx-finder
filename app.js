// CFX code to load (change this to any CFX ID you want)
const CFX_CODE = "o9kk7r"; // example: Zephyr; replace with your own if needed

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
  // Copy IP
  const copyIPBtn = document.getElementById("copyIP");
  if (copyIPBtn) {
    copyIPBtn.onclick = () => {
      if (ipFull !== "Unknown") navigator.clipboard.writeText(ipFull);
    };
  }

  // Copy CFX
  const copyCFXBtn = document.getElementById("copyCFX");
  if (copyCFXBtn) {
    copyCFXBtn.onclick = () => navigator.clipboard.writeText(cfx);
  }

  // Open in FiveM
  const openFiveMBtn = document.getElementById("openFiveM");
  if (openFiveMBtn) {
    openFiveMBtn.onclick = () => {
      if (ipFull !== "Unknown") window.location.href = `fivem://connect/${ipFull}`;
    };
  }

  // Discord
  const discordBtn = document.getElementById("openDiscord");
  if (discordBtn) {
    const discordLink = d.vars && d.vars.Discord ? d.vars.Discord : null;
    discordBtn.onclick = () => {
      if (discordLink) window.open(discordLink, "_blank");
    };
  }

  // Website
  const websiteBtn = document.getElementById("openWebsite");
  if (websiteBtn) {
    const websiteLink = d.vars && d.vars.Website ? d.vars.Website : null;
    websiteBtn.onclick = () => {
      if (websiteLink) window.open(websiteLink, "_blank");
    };
  }

  // Players JSON
  const playersJSONBtn = document.getElementById("playersJSON");
  if (playersJSONBtn) {
    playersJSONBtn.onclick = () => {
      window.open(
        `https://servers-frontend.fivem.net/api/servers/single/${cfx}/players`,
        "_blank"
      );
    };
  }

  // Server Info JSON
  const serverJSONBtn = document.getElementById("serverJSON");
  if (serverJSONBtn) {
    serverJSONBtn.onclick = () => {
      window.open(url, "_blank");
    };
  }
}

// GeoIP lookup for locale
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
  } catch (err) {
    console.error("GeoIP error:", err);
    return "Unknown";
  }
}
