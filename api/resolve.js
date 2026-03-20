export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Missing CFX code" });
  }

  try {
    const url = `https://servers-frontend.fivem.net/api/servers/single/${code}`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(404).json({ error: "Server not found" });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch server data" });
  }
}
