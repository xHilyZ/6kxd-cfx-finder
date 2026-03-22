export default async function handler(req, res) {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ error: "Missing server code" });
    }

    const serverCode = code.toLowerCase();

    // --- CFX META FETCH ---
    const metaRes = await fetch(
      `https://servers-frontend.fivem.net/api/servers/single/${serverCode}`
    );

    if (!metaRes.ok) {
      return res.status(500).json({ error: "CFX API error" });
    }

    const meta = await metaRes.json();

    // --- RESOLVE IP ---
    const ipPort = meta?.Data?.connectEndPoints?.[0] || null;

    // --- INTERNAL FETCH ---
    let players = [];
    let resources = [];

    if (ipPort) {
      const base = `http://${ipPort}`;

      try {
        const p = await fetch(`${base}/players.json`);
        if (p.ok) players = await p.json();
      } catch {}

      try {
        const r = await fetch(`${base}/resources.json`);
        if (r.ok) resources = await r.json();
      } catch {}

      if (!resources.length) {
        try {
          const d = await fetch(`${base}/dynamic.json`);
          if (d.ok) {
            const dyn = await d.json();
            if (dyn.resources) resources = dyn.resources.map(r => r.name);
          }
        } catch {}
      }

      if (!resources.length) {
        try {
          const i = await fetch(`${base}/info.json`);
          if (i.ok) {
            const info = await i.json();
            if (info.resources) resources = info.resources;
          }
        } catch {}
      }
    }

    // --- RESPONSE ---
    return res.status(200).json({
      code: serverCode,
      meta,
      ipPort,
      players,
      resources,
      lastSeen: new Date().toISOString()
    });

  } catch (err) {
    console.error("SERVERLESS CRASH:", err);
    return res.status(500).json({ error: "Serverless function crashed" });
  }
}
