/* Mission Planner PDF export.
   Classic script: extends window.Planner with savePdf(). */
'use strict';

(function () {
    const P = window.Planner;
    if (!P) return;

    P.savePdf = function () {
        if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
            window.Toast.show('PDF library not loaded. Check your connection and retry.');
            return;
        }
        const out = document.getElementById('planner-output');
        if (!out || !out.textContent.trim()) {
            window.Toast.show('Complete the mission wizard first.');
            return;
        }
        const items = Object.entries(this.plan).map(([k, v]) => [k, v]);
        const ranked = this.rankSites(this.plan);
        const top = ranked[0];
        const date = new Date().toISOString().slice(0, 10);

        // jsPDF 2.x exposes the constructor on the global after the UMD load.
        const { jsPDF } = window.jspdf || {};
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 40;
        let y = margin;

        doc.setFontSize(18);
        doc.text('Planetary Explorer - Mission Planner', margin, y);
        y += 22;
        doc.setFontSize(11);
        doc.text('Generated: ' + date, margin, y);
        y += 28;

        doc.setFontSize(13);
        doc.text('Mission Brief', margin, y);
        y += 18;
        doc.setFontSize(10.5);
        items.forEach(([k, v]) => {
            doc.text(k + ': ' + v, margin + 10, y);
            y += 15;
        });
        y += 10;

        doc.setFontSize(13);
        doc.text('Site Viability Ranking', margin, y);
        y += 18;
        const colRank = margin, colSite = margin + 30, colBody = margin + 230,
              colScore = margin + 300, colSci = margin + 350, colCost = margin + 400, colRisk = margin + 450;
        doc.setFont('helvetica', 'bold');
        [colRank, colSite, colBody, colScore, colSci, colCost, colRisk].forEach(cx => doc.text(' ', cx, y));
        doc.text('Rank', colRank, y);
        doc.text('Site', colSite, y);
        doc.text('Body', colBody, y);
        doc.text('Score', colScore, y);
        doc.text('Sci', colSci, y);
        doc.text('Cost', colCost, y);
        doc.text('Risk', colRisk, y);
        y += 16;
        doc.setFont('helvetica', 'normal');
        ranked.forEach((r, i) => {
            if (y > pageH - 40) { doc.addPage(); y = margin; }
            const label = (i === 0 ? '#1 ' : '#' + (i + 1) + ' ') + r.site.name;
            doc.text(label, colSite, y);
            doc.text(r.site.body, colBody, y);
            doc.text(String(r.score), colScore, y);
            doc.text(String(r.science), colSci, y);
            doc.text(String(r.cost), colCost, y);
            doc.text(String(r.risk), colRisk, y);
            y += 14;
        });
        y += 10;

        doc.setFont('helvetica', 'bold');
        doc.text('Recommendation', margin, y);
        y += 16;
        doc.setFont('helvetica', 'normal');
        doc.text('Best pick: ' + top.site.name + ' (' + top.site.body + ')', margin, y);
        y += 14;
        doc.text('Viability score: ' + top.score + ' / 100', margin, y);
        y += 14;
        doc.text('Science value: ' + top.science + '   |   Mission cost proxy: ' + top.cost + '   |   Terrain risk: ' + top.risk, margin, y);

        const safe = (this.plan['Target Site'] || 'mission').replace(/\s+/g, '_');
        doc.save('mission_plan_' + safe + '_' + date + '.pdf');
        window.Toast.show('PDF saved: mission plan');
    };
})();