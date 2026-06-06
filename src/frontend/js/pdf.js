window.exportPDF = function() {
    if (typeof jspdf === 'undefined') {
        alert("PDF Library not loaded!");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("Universe Booklet Report", 14, 22);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Category: ${window.currentTab || 'All'}`, 14, 36);

    const data = window.globalData || [];
    if (!data.length) { alert("No data available to export"); return; }

    const tableData = data.slice(0, 20).map(item => {
        if (window.currentTab === 'asteroids') {
            return [item.name, item.date, item.diameter_km, item.velocity_kmh, item.hazardous ? 'Yes' : 'No'];
        } else {
            return [item.pl_name, item.hostname, item.pl_rade, item.pl_bmasse, item.esi];
        }
    });

    const headers = window.currentTab === 'asteroids' 
        ? [['Name', 'Date', 'Diameter(km)', 'Velocity(km/h)', 'Hazardous']]
        : [['Name', 'Host', 'Radius', 'Mass', 'ESI']];

    doc.autoTable({
        head: headers,
        body: tableData,
        startY: 45,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 172, 254] }
    });

    doc.save(`universe_report_${window.currentTab}.pdf`);
};