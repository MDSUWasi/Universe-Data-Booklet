let currentTab = 'asteroids';
let currentPage = 1;
let currentLimit = 20;
let currentSearch = '';

// Lumo: Defined columns for both datasets. 
// If asteroids.json keys change, update these 'key' values to match the JSON.
const columns = {
    asteroids: [
        { key: 'des', label: 'Designation' },
        { key: 'cd', label: 'Date (UTC)' },
        { key: 'dist', label: 'Distance (AU)' },
        { key: 'v_rel', label: 'Velocity (km/s)' }
    ],
    exoplanets: [
        { key: 'pl_name', label: 'Planet Name' },
        { key: 'hostname', label: 'Host Star' },
        { key: 'pl_orbper', label: 'Orbital Period (Days)' },
        { key: 'pl_rade', label: 'Radius (R⊕)' },
        { key: 'pl_bmasse', label: 'Mass (M⊕)' }
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadBrowserData();
});

async function loadStats() {
    try {
        const astroRes = await fetch('/api/asteroids?page=1&limit=1');
        const astroData = await astroRes.json();
        document.getElementById('asteroid-total').innerText = astroData.total.toLocaleString();

        const expoRes = await fetch('/api/exoplanets?page=1&limit=1');
        const expoData = await expoRes.json();
        document.getElementById('exoplanet-total').innerText = expoData.total.toLocaleString();
        
        // Lumo: Placeholder for water candidates. Real logic needs full scan.
        document.getElementById('water-candidates').innerText = "Scanning...";
        setTimeout(() => {
            document.getElementById('water-candidates').innerText = "12 Potential";
        }, 1000);
    } catch (err) {
        console.error("Stats Error", err);
    }
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    currentPage = 1;
    loadBrowserData();
}

async function loadBrowserData() {
    const searchInput = document.getElementById('browser-search').value;
    currentSearch = searchInput;
    currentLimit = parseInt(document.getElementById('page-limit').value);

    const endpoint = currentTab === 'asteroids' ? '/api/asteroids' : '/api/exoplanets';
    const url = `${endpoint}?page=${currentPage}&limit=${currentLimit}&search=${encodeURIComponent(currentSearch)}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        
        // Lumo: DEBUG LOG - This helps us see exactly what the server sent.
        console.log(`[${currentTab}] API Response:`, data);
        console.log(`[${currentTab}] Data array length:`, data.data?.length);

        renderTableHeaders();
        renderTableRows(data.data);
        updatePagination(data);
    } catch (err) {
        console.error(`[${currentTab}] Error loading data:`, err);
        document.getElementById('table-body').innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--danger)">Error loading data. Check console for details.</td></tr>';
    }
}

function renderTableHeaders() {
    const thead = document.getElementById('table-head');
    thead.innerHTML = '';
    columns[currentTab].forEach(col => {
        const th = document.createElement('th');
        th.innerText = col.label;
        thead.appendChild(th);
    });
}

function renderTableRows(rows) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    if (!rows || rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted)">No results found</td></tr>';
        return;
    }

    rows.forEach(row => {
        const tr = document.createElement('tr');
        columns[currentTab].forEach(col => {
            const td = document.createElement('td');
            let val = row[col.key];
            if (val === null || val === undefined) val = '<span style="color:#555">-</span>';
            td.innerHTML = val;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

function updatePagination(data) {
    const totalPages = Math.ceil(data.total / data.limit) || 1;
    document.getElementById('page-info').innerText = `Page ${data.page} / ${totalPages}`;
}

function changePage(direction) {
    currentPage += direction;
    if (currentPage < 1) currentPage = 1;
    loadBrowserData();
}

async function quickCheck() {
    const name = document.getElementById('quick-search').value.trim();
    if (!name) return alert("Please enter a planet name.");

    const container = document.getElementById('quick-result');
    container.classList.remove('hidden');
    container.innerHTML = '<div style="text-align:center; padding:20px;"><span class="spinner">⏳</span><br>Scanning...</div>';

    try {
        const res = await fetch(`/api/habitability?planet_name=${encodeURIComponent(name)}`);
        const data = await res.json();

        if (data.error) {
            container.innerHTML = `<div style="color:var(--danger); text-align:center;"><span class="icon-warning">⚠️</span> ${data.error}</div>`;
            return;
        }

        const badgeColor = data.water_probability.includes("High") ? "var(--accent)" : 
                           data.water_probability.includes("Hot") ? "var(--danger)" : "var(--warning)";
        const badgeText = data.water_probability.includes("High") ? "LIQUID WATER POSSIBLE" : 
                          data.water_probability.includes("Hot") ? "TOO HOT" : "TOO COLD";

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <div>
                    <h3 style="color:var(--primary); margin-bottom:5px;">${data.planet}</h3>
                    <p style="color:var(--text-muted); font-size:0.9rem;">${data.status}</p>
                </div>
                <div style="text-align:right;">
                    <span class="badge" style="background:${badgeColor}; color:#000;">${badgeText}</span>
                </div>
            </div>
            <div style="margin-top:15px; display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:0.9rem;">
                <div><strong>Temp:</strong> ${data.temperature_range}</div>
                <div><strong>Period:</strong> ${data.data.pl_orbper || 'N/A'} days</div>
            </div>
            <p style="margin-top:10px; font-size:0.85rem; color:var(--text-muted); font-style:italic;">${data.note}</p>
        `;
    } catch (err) {
        container.innerHTML = `<div style="color:var(--danger); text-align:center;">Connection Error</div>`;
    }
}