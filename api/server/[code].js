// /api/server/[code].js
export default async function handler(req, res) {
  const { code } = req.query;
  const key = code.toLowerCase();

  const CACHE_TTL_MS = 60 * 1000;
  const cache = global.cache || (global.cache = new Map());

  function setCache(k, value) {
    cache.set(k, { value, ts: Date.now() });
  }

  function getCache(k) {
    const entry = cache.get(k);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      cache.delete(k);
      return null;
    }
    return entry.value;
  }

  async function fetchCFXMeta(code) {
    const url = `https://servers-frontend.fivem.net/api/servers/single/${code}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("CFX API error");
    return res.json();
  }

  async function resolveRealIP(meta) {
    const ep = meta?.Data?.connectEndPoints?.[0];
    return ep || null;
  }

  async function fetchInternal(ipPort) {
    if (!ipPort) return { players: [], resources: [] };

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

    return { players, resources };
  }

  // Check cache
  const cached = getCache(key);
  if (cached) {
    return res.status(200).json({ ...cached, cached: true });
  }

  try {
    const meta = await fetchCFXMeta(key);
    const ipPort = await resolveRealIP(meta);
    const { players, resources } = await fetchInternal(ipPort);

    const payload = {
      code: key,
      meta,
      ipPort,
      players,
      resources,
      cached: false,
      lastSeen: new Date().toISOString()
    };

    setCache(key, payload);
    return res.status(200).json(payload);
  } catch (err) {
    console.error("Resolver error:", err);
    return res.status(500).json({ error: "Resolver crashed" });
  }
}
