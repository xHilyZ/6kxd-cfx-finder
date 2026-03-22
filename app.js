/* ============================================================
   DOM READY (bulletproof)
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
       PAGE DETECTION
    ============================================================= */
    const path = window.location.pathname.toLowerCase();
    const isHome = path.includes("index") || path.endsWith("/") || path.endsWith("/index.html");
    const isServer = path.includes("server");

    const $ = id => document.getElementById(id);

    /* ============================================================
       HOMEPAGE LOGIC
    ============================================================= */
    if (isHome) {
      const input = $("cfxInput");
      const analyzeBtn = $("analyzeBtn");
      const recentList = $("recentList");
      const recentWrap = $("recentLookups");
      const clearRecent = $("clearRecent");

      if (!input || !analyzeBtn) return;

      function extractCFX(str) {
        const match = str.match(/[a-zA-Z0-9]{6}/);
        return match ? match[0] : null;
      }

      function saveRecent(code) {
        let list = JSON.parse(localStorage.getItem("recentCFX") || "[]");
        list = [code, ...list.filter(x => x !== code)].slice(0, 10);
        localStorage.setItem("recentCFX", JSON.stringify(list));
        loadRecent();
      }

      function loadRecent() {
        const list = JSON.parse(localStorage.getItem("recentCFX") || "[]");
        recentList.innerHTML = "";

        if (list.length === 0) {
          recentWrap.style.display = "none";
          return;
        }

        recentWrap.style.display = "block";

        list.forEach(code => {
          const tag = document.createElement("div");
          tag.className = "recent-tag glass";
          tag.textContent = code;
          tag.onclick = () => (window.location.href = `server.html?code=${code}`);
          recentList.appendChild(tag);
        });
      }

      analyzeBtn.onclick = () => {
        const code = extractCFX(input.value.trim());
        if (!code) return alert("Invalid CFX code.");
        saveRecent(code);
        window.location.href = `server.html?code=${code}`;
      };

      input.addEventListener("keypress", e => {
        if (e.key === "Enter") analyzeBtn.onclick();
      });

      clearRecent.onclick = () => {
        localStorage.removeItem("recentCFX");
        loadRecent();
      };

      loadRecent();
      return;
    }

    /* ============================================================
       SERVER PAGE LOGIC
    ============================================================= */
    if (isServer) {
      let lastData = null;

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

      /* ============================================================
         FETCH HELPERS
      ============================================================= */
      async function fetchServer(code) {
        const url = `https://servers-frontend.fivem.net/api/servers/single/${code}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("CFX API error");
        return res.json();
      }

      async function fetchInternal(ipPort) {
        const base = `http://${ipPort}`;
        let players = [];
        let resources = [];

        // players.json
        try {
          const p = await fetch(`${base}/players.json`);
          if (p.ok) players = await p.json();
        } catch {}

        // resources.json
        try {
          const r = await fetch(`${base}/resources.json`);
          if (r.ok) resources = await r.json();
        } catch {}

        // dynamic.json fallback
        if (!resources.length) {
          try {
            const d = await fetch(`${base}/dynamic.json`);
            if (d.ok) {
              const dyn = await d.json();
              if (dyn.resources) resources = dyn.resources.map(r => r.name);
            }
          } catch {}
        }

        // info.json fallback
        if (!resources.length) {
          try {
            const i = await fetch(`${base}/info.json`);
            if (i.ok) {
              const info = await i.json();
              if (info.resources) resources = info.resources;
            }
          } catch {}
        }

        return { players, resources };
      }

      /* ============================================================
         RESOURCE CATEGORY DETECTION (Option 1)
      ============================================================= */
      function detectCategory(name) {
        const n = name.toLowerCase();

        if (n.match(/job|police|crime|weapon|craft|ambulance|mechanic|taxi|bus|gang|role|tools|armoury/))
          return "Gameplay";

        if (n.match(/ui|hud|menu|radial|chat|imageui|interface/))
          return "Interface";

        if (n.match(/car|vehicle|garage|keys|audio|mileage|radiocar/))
          return "Vehicles";

        if (n.match(/map|mlo|interior|gabz|hospital|club|pier|postal/))
          return "Maps";

        if (n.match(/addon|script|inventory|ox_|qb_|qbx_|rcore_|randol_/))
          return "Scripts";

        return "Other";
      }

      /* ============================================================
         RENDER RESOURCES (glass tags, alphabetical categories)
      ============================================================= */
      function renderFullResources(resources) {
        const categories = {};

        resources.forEach(r => {
          const cat = detectCategory(r);
          if (!categories[cat]) categories[cat] = [];
          categories[cat].push(r);
        });

        const sortedCats = Object.keys(categories).sort();

        let html = "";

        sortedCats.forEach(cat => {
          if (categories[cat].length === 0) return; // hide empty categories

          html += `<div class="resource-category">
                     <h3>${cat} (${categories[cat].length})</h3>
                     <div class="resource-tags">`;

          categories[cat].forEach(r => {
            html += `<span class="resource-tag glass">${r}</span>`;
          });

          html += `</div></div>`;
        });

        fullResources.innerHTML = html;

        if (resourceSearch) {
          resourceSearch.oninput = () => {
            const q = resourceSearch.value.toLowerCase();
            const filtered = resources.filter(r => r.toLowerCase().includes(q));
            renderFullResources(filtered);
          };
        }
      }

      /* ============================================================
         RENDER PLAYERS
      ============================================================= */
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
              <span class="player-name">${p.name}</span>
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
         LOAD SERVER
      ============================================================= */
      async function loadServer(code) {
        try {
          const data = await fetchServer(code);
          lastData = data;

          const d = data.Data;

          if (d.vars?.banner_detail) {
            serverBanner.src = d.vars.banner_detail;
            serverBannerWrap.style.display = "block";
          } else {
            serverBannerWrap.style.display = "none";
          }

          nameEl.textContent = d.hostname;
          ipEl.textContent = `IP: ${d.connectEndPoints?.[0] || "Unknown"}`;

          playersEl.textContent = `${d.clients} / ${d.sv_maxclients}`;
          resourcesEl.textContent = d.resources.length;
          buildEl.textContent = d.vars?.sv_enforceGameBuild || "Unknown";
          localeEl.textContent = d.locale || "Unknown";

          descEl.textContent = d.vars?.sv_projectDesc || "No description";
          locEl.textContent = "Location info unavailable.";

          const ip = d.connectEndPoints?.[0]?.split(":")[0];
          if (ip) {
            try {
              const res = await fetch(`https://ipapi.co/${ip}/json/`);
              const geo = await res.json();
              const flag = geo.country
                ? String.fromCodePoint(...[...geo.country].map(c => 127397 + c.charCodeAt()))
                : "";
              countryEl.textContent = `${geo.country_name || "Unknown"} ${flag}`;
            } catch {
              countryEl.textContent = "Unknown";
            }
          }

          serverInfo.style.opacity = "1";

        } catch (err) {
          alert("Failed to load server info.");
          console.error(err);
        }
      }

      /* ============================================================
         FULL PANEL OPEN
      ============================================================= */
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

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) loadServer(code);

      return;
    }

  });
})();
