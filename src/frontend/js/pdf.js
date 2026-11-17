/* Save current data table as PDF (Asteroids / Exoplanets).
   Classic script: exposes window.exportPDF(). Reads live state from
   window.State (set by app.js) with fallbacks for older globals. */
window.exportPDF = function () {
    if (typeof jspdf === 'undefined') {
        alert("PDF Library not loaded!");
        return;
    }

    const { jsPDF } = window.jspdf;
    const state = window.State || {};
    const view = state.currentView || window.currentTab || 'all';
    const data = state.currentData || window.globalData || [];

    if (!data.length) { alert("No data available to export"); return; }

    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("Universe Data Booklet Report", 14, 22);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Category: ${view}`, 14, 36);

    const headers = view === 'asteroids'
        ? [['Name', 'Date', 'Diameter (km)', 'Velocity (km/h)', 'Hazardous']]
        : [['Name', 'Host Star', 'Radius (R⊕)', 'Mass (M⊕)', 'ESI']];

    const tableData = data.slice(0, 50).map(item => {
        if (view === 'asteroids') {
            return [item.name || item.designation || 'Unknown', item.date || '—', item.diameter_km, item.velocity_kmh, item.hazardous ? 'Yes' : 'No'];
        } else {
            return [item.pl_name || 'Unknown', item.hostname || '—', item.pl_rade, item.pl_bmasse, item.esi];
        }
    });

    doc.autoTable({
        head: headers,
        body: tableData,
        startY: 45,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 172, 254] }
    });

    doc.save(`universe_report_${view}.pdf`);
};
