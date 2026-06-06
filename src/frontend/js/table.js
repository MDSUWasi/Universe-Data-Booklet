let currentPage = 1;
const ITEMS_PER_PAGE = 50;
let currentFilteredData = [];
let debounceTimer = null;

window.handleSearch = function(val) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const term = val.toLowerCase().trim();
        if (!window.globalData) return;
        
        currentFilteredData = term ? window.globalData.filter(item => {
            const str = `${item.name||''} ${item.pl_name||''} ${item.hostname||''}`.toLowerCase();
            return str.includes(term);
        }) : [...window.globalData];
        
        currentPage = 1;
        renderTableGlobal();
    }, 300);
};

window.prevPage = () => { 
    const total = Math.ceil((currentFilteredData.length || window.globalData?.length)/ITEMS_PER_PAGE);
    if(currentPage > 1){currentPage--; renderTableGlobal();} 
};

window.nextPage = () => { 
    const total = Math.ceil((currentFilteredData.length || window.globalData?.length)/ITEMS_PER_PAGE);
    if(currentPage < total){currentPage++; renderTableGlobal();}
};

function renderTableGlobal() {
    const container = document.getElementById('table-container');
    if (!container || !window.globalData) return;
    
    const data = currentFilteredData.length ? currentFilteredData : window.globalData;
    if (!data.length) { container.innerHTML = '<p style="text-align:center;padding:20px;">No results found.</p>'; updatePaginationUI(0); return; }
    
    const start = (currentPage-1)*ITEMS_PER_PAGE;
    const pageData = data.slice(start, start+ITEMS_PER_PAGE);
    const total = data.length;
    const totalPages = Math.ceil(total/ITEMS_PER_PAGE);
    
    let headers = [], rows = [];
    if(window.currentTab === 'asteroids') {
        headers = ['Name', 'Date', 'Diam (km)', 'Vel (km/h)', 'Hazardous'];
        rows = pageData.map(i => [i.name, i.date, i.diameter_km, i.velocity_kmh, i.hazardous?'Yes':'No']);
    } else {
        headers = ['Name', 'Host', 'Radius', 'Mass', 'ESI', 'Status'];
        rows = pageData.map(i => [i.pl_name, i.hostname, parseFloat(i.pl_rade||0).toFixed(2), parseFloat(i.pl_bmasse||0).toFixed(2), i.esi||'N/A', i.status||'?']);
    }
    
    let html = `<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>`;
    rows.forEach(r => html += `<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`);
    html += '</tbody></table>';
    
    container.innerHTML = html;
    updatePaginationUI(total, totalPages);
}

function updatePaginationUI(total, totalPages) {
    const info = document.getElementById('page-info');
    const prevBtn = document.querySelector('#pagination button:first-child');
    const nextBtn = document.querySelector('#pagination button:last-child');
    
    if (info) {
        const start = (currentPage-1)*ITEMS_PER_PAGE + 1;
        const end = Math.min(currentPage*ITEMS_PER_PAGE, total);
        info.textContent = `Showing ${start}-${end} of ${total} (Page ${currentPage}/${totalPages || 1})`;
    }
    
    if(prevBtn) prevBtn.disabled = currentPage === 1;
    if(nextBtn) nextBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// Expose globally for app.js
window.renderTableGlobal = renderTableGlobal;