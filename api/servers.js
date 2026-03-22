// Cached server list in memory
let cachedServers = [];
let lastUpdated = 0;

// AU IP prefixes
const AU_IPS = [
  "139.99.", "103.212.", "51.79.", "54.206.",
  "43.229.", "103.1.", "45.248."
];

// Fetch full server list from CFX stream
async function fetchServers() {
  const res = await fetch("https://servers-frontend.fivem.net/api/servers/stream", {
    method: "GET"
  });

  if (!res.ok) {
    console.error("Failed to fetch CFX stream");
    return [];
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let servers = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      try {
        const obj = JSON.parse(line);

        const endpoints = obj?.Data?.connectEndPoints || [];
        const isAU = endpoints.some(ip =>
          AU_IPS.some(prefix => ip.startsWith(prefix))
        );

        if (isAU) {
          servers.push({
            name: obj.Data?.hostname || "Unknown",
            players: obj.Data?.players?.length || 0,
            endpoints,
            code: obj.EndPoint || null,
            icon: obj.Data?.icon || null
          });
        }

      } catch (e) {
        // ignore broken lines
      }
    }
  }

  return servers;
}

export default async function handler(req, res) {
  const now = Date.now();

  // Refresh cache every 1 hour
  if (now - lastUpdated > 3600000 || cachedServers.length === 0) {
    console.log("Refreshing AU server cache...");
    cachedServers = await fetchServers();
    lastUpdated = now;
  }

  res.status(200).json({
    updated: new Date(lastUpdated).toISOString(),
    count: cachedServers.length,
    servers: cachedServers
  });
}
