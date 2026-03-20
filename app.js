const fullPanel = document.getElementById("fullPanel");
const overlay = document.getElementById("overlay");
const openFullPanel = document.getElementById("openFullPanel");
const closePanel = document.getElementById("closePanel");
const fullPlayers = document.getElementById("fullPlayers");
const fullResources = document.getElementById("fullResources");

openFullPanel.onclick = () => {
  if (!lastData) return alert("Run a lookup first.");

  const d = lastData.Data;

  // Players
  let pHtml = "<ul>";
  d.players.forEach(p => {
    pHtml += `<li>[${p.id}] ${p.name} — ${p.ping}ms</li>`;
  });
  pHtml += "</ul>";
  fullPlayers.innerHTML = pHtml;

  // Resources
  let rHtml = "<ul>";
  d.resources.forEach(r => {
    rHtml += `<li>${r}</li>`;
  });
  rHtml += "</ul>";
  fullResources.innerHTML = rHtml;

  fullPanel.classList.add("open");
  overlay.classList.add("show");
};

closePanel.onclick = () => {
  fullPanel.classList.remove("open");
  overlay.classList.remove("show");
};

overlay.onclick = () => {
  fullPanel.classList.remove("open");
  overlay.classList.remove("show");
};
