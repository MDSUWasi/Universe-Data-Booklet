const API = "/api/sites";

async function loadSites() {
  const tbody = document.querySelector("#sites-table tbody");
  tbody.innerHTML = "<tr><td colspan='5'>Loading...</td></tr>";
  try {
    const res = await fetch(API);
    const data = await res.json();
    tbody.innerHTML = "";
    for (const s of data.sites) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${s.site}</td><td>${s.area_km2}</td>` +
                     `<td>${s.rough_mean_m}</td><td>${s.rough_p95_m}</td>` +
                     `<td>${s.rough_max_m}</td>`;
      tbody.appendChild(tr);
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan='5'>Failed: ${err.message}</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("load").addEventListener("click", loadSites);
});
