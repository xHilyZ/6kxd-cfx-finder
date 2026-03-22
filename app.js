/* ============================================================
   DOM READY WRAPPER (bulletproof)
============================================================ */
(function () {
  function domReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(fn, 1);
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  domReady(() => {

    /* ============================================================
       GLOBAL STATE
    ============================================================ */
    let lastData = null;

    /* ============================================================
       ELEMENTS (SAFE LOOKUP)
    ============================================================ */
    const $ = id => document.getElementById(id);

    const serverInfo = $("serverInfo");
    const serverBanner = $("serverBanner");
    const serverBannerWrap = $("serverBannerWrap");

    const nameEl = $("serverName");
    const ipEl = $("serverIP");
    const playersEl = $("statPlayers");
    const resourcesEl = $("statResources");
    const buildEl = $("statBuild");
    const localeEl = $("statLocale");

    const descEl = $("serverDesc");
    const locEl = $("serverLoc");
    const countryEl = $("serverCountry");

    const pingHeatmap = $("pingHeatmap");
    const jsonOutput = $("jsonOutput");

    const fullPanel = $("fullPanel");
    const overlay = $("overlay");
    const openFullPanel = $("openFullPanel");
    const closePanel = $("closePanel");
    const fullPlayers = $("fullPlayers");
    const fullResources = $("fullResources");

    const playerSearch = $("playerSearch");
    const resourceSearch = $("resourceSearch");
    const resourceSort = $("resourceSort");

    /* ============================================================
       UTILS
    ============================================================ */
    const escapeHTML = str =>
      String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const cleanName = name => name.replace(/\^[0-9]/g, "");

    /* ============================================================
       FETCH CFX
    ============================================================ */
    async function fetchServer(code) {
      const url = `https://servers-frontend.fivem.net/api/servers/single/${code}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("CFX API error");
      return res.json();
    }

    /* ============================================================
       FETCH INTERNAL ENDPOINTS
    ============================================================ */
    async function fetchInternal(ipPort) {
      const base = `http://${ipPort}`;

      let players = [];
      let resources = [];

      try {
        const p = await fetch(`${base}/players.json`);
        if (p.ok) players = await p.json();
      } catch {}

      try {
        const r = await fetch(`${base}/resources.json`);
        if (r.ok) resources = await r.json();
      } catch {}

      return { players, resources };
    }

    /* ============================================================
       MAIN LOAD FUNCTION
    ============================================================ */
    async function loadServer(code) {
      try {
        const data = await fetchServer(code);
        lastData = data;

        const d = data.Data;

        /* Banner */
        if (d.vars?.banner_detail) {
          serverBanner.src = d.vars.banner_detail;
          serverBannerWrap.style.display = "block";
        } else {
          serverBannerWrap.style.display = "none";
        }

        /* Basic Info */
        nameEl.textContent = escapeHTML(cleanName(d.hostname));
        ipEl.textContent = `IP: ${d.connectEndPoints?.[0] || "Unknown"}`;

        playersEl.textContent = `${d.clients} / ${d.sv_maxclients}`;
        resourcesEl.textContent = d.resources.length;
        buildEl.textContent = d.vars?.sv_enforceGameBuild || "Unknown";
        localeEl.textContent = d.locale || "Unknown";

        descEl.textContent = escapeHTML(d.vars?.sv_projectDesc || "No description");
        locEl.textContent = "Location info unavailable.";

        /* GeoIP */
        const ip = d.connectEndPoints?.[0]?.split(":")[0];
        if (ip) {
          countryEl.textContent = await fetchGeoIP(ip);
        }

        serverInfo.style.opacity = "1";

        /* Heatmap */
        renderHeatmap(d.players);

      } catch (err) {
        alert("Failed to load server info.");
        console.error(err);
      }
    }

    /* ============================================================
       HEATMAP
    ============================================================ */
    function renderHeatmap(players) {
      if (!players || players.length === 0) {
        pingHeatmap.style.display = "none";
        return;
      }

      pingHeatmap.style.display = "block";
      pingHeatmap.innerHTML = "";

      const ranges = {
        "0–50ms": players.filter(p => p.ping <= 50).length,
        "50–100ms": players.filter(p => p.ping > 50 && p.ping <= 100).length,
        "100–150ms": players.filter(p => p.ping > 100 && p.ping <= 150).length,
        "150ms+": players.filter(p => p.ping > 150).length
      };

      const max = Math.max(...Object.values(ranges));

      for (const [label, count] of Object.entries(ranges)) {
        const row = document.createElement("div");
        row.className = "heatmap-row";

        const lbl = document.createElement("div");
        lbl.className = "heatmap-label";
        lbl.textContent = label;

        const bar = document.createElement("div");
        bar.className = "heatmap-bar";
        bar.style.width = `${(count / max) * 100}%`;

        row.appendChild(lbl);
        row.appendChild(bar);
        pingHeatmap.appendChild(row);
      }
    }

    /* ============================================================
       JSON BUTTONS
    ============================================================ */
    $("playersJson").onclick = () => {
      jsonOutput.style.display = "block";
      jsonOutput.textContent = JSON.stringify(lastData?.Data?.players || {}, null, 2);
    };

    $("infoJson").onclick = () => {
      jsonOutput.style.display = "block";
      jsonOutput.textContent = JSON.stringify(lastData?.Data || {}, null, 2);
    };

    /* ============================================================
       FULL PANEL (INTERNAL ENDPOINTS)
    ============================================================ */
    if (openFullPanel) {
      openFullPanel.onclick = async () => {
        if (!lastData) return alert("Run a lookup first.");

        const d = lastData.Data;
        const ipPort = d.connectEndPoints?.[0];

        if (!ipPort) {
          alert("Server IP unavailable.");
          return;
        }

        const { players, resources } = await fetchInternal(ipPort);

        if (!players.length) {
          fullPlayers.innerHTML =
            "<div class='player-row glass'>Player list hidden or unavailable.</div>";
        } else {
          renderFullPlayers(players);
        }

        if (!resources.length) {
          fullResources.innerHTML =
            "<div class='resource-row glass'>Resource list hidden or unavailable.</div>";
        } else {
          renderFullResources(resources);
        }

        fullPanel.classList.add("open");
        overlay.classList.add("show");
      };
    }

    if (closePanel) {
      closePanel.onclick = () => {
        fullPanel.classList.remove("open");
        overlay.classList.remove("show");
      };
    }

    if (overlay) {
      overlay.onclick = () => {
        fullPanel.classList.remove("open");
        overlay.classList.remove("show");
      };
    }

    /* ============================================================
       PLAYER RENDERER
    ============================================================ */
    function renderFullPlayers(players) {
      let html = "<ul>";
      players.forEach(p => {
        let pingClass =
          p.ping <= 60 ? "ping-good" :
          p.ping <= 120 ? "ping-mid" :
          "ping-bad";

        html += `
          <li>
            <span class="player-id">[${p.id}]</span>
            <span class="player-name">${escapeHTML(p.name)}</span>
            <span class="player-ping ${pingClass}">${p.ping}ms</span>
          </li>
        `;
      });
      html += "</ul>";
      fullPlayers.innerHTML = html;

      if (playerSearch) {
        playerSearch.oninput = () => {
          const q = playerSearch.value.toLowerCase();
          const filtered = players.filter(p =>
            p.name.toLowerCase().includes(q) ||
            String(p.id).includes(q) ||
            String(p.ping).includes(q)
          );
          renderFullPlayers(filtered);
        };
      }
    }

    /* ============================================================
       RESOURCE RENDERER
    ============================================================ */
    function renderFullResources(resources) {
      let html = "<ul>";
      resources.forEach(r => {
        html += `<li>${escapeHTML(r)}</li>`;
      });
      html += "</ul>";
      fullResources.innerHTML = html;

      if (resourceSearch) {
        resourceSearch.oninput = () => {
          const q = resourceSearch.value.toLowerCase();
          const filtered = resources.filter(r => r.toLowerCase().includes(q));
          renderFullResources(filtered);
        };
      }

      if (resourceSort) {
        resourceSort.onclick = () => {
          const sorted = [...resources].sort();
          renderFullResources(sorted);
        };
      }
    }

    /* ============================================================
       GEOIP
    ============================================================ */
    async function fetchGeoIP(ip) {
      try {
        const res = await fetch(`https://ipapi.co/${ip}/json/`);
        const data = await res.json();

        const flag = data.country
          ? String.fromCodePoint(
              ...[...data.country].map(c => 127397 + c.charCodeAt())
            )
          : "";

        return `${data.country_name || "Unknown"} ${flag}`;
      } catch {
        return "Unknown";
      }
    }

    /* ============================================================
       AUTO-LOAD IF URL HAS ?code=
    ============================================================ */
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) loadServer(code);

  }); // END domReady
})();
