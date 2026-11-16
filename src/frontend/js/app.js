/* Bootstrap: wires page-level event handlers.

   Feature modules are independent of each other; they only reach each other
   through window.<Module>.  index.html loads each ../modules/* file as a
   classic script in dependency order, so the existing inline HTML handlers
   (onclick="UI.openModal('map')") keep working unchanged.
   This file is loaded last, after every module has registered itself. */
'use strict';

window.onload = () => {
    if (window.Sidebar) window.Sidebar.init();
    if (window.Starfield) window.Starfield.init();
    if (window.Cache) window.Cache.init();
    if (window.Toast) window.Toast.init();
    if (window.Selector) window.Selector.init();
    // Theme must be applied before any feature renders so the palette is
    // consistent from the first paint.
    if (window.Theme) window.Theme.init();

    // Mission Planner: wire the wizard buttons (independent of the step UI).
    const plannerBack = document.getElementById('planner-back');
    const plannerNext = document.getElementById('planner-next');
    const plannerPdf = document.getElementById('planner-pdf');
    if (plannerBack) plannerBack.onclick = () => { if (window.Planner) window.Planner.back(); };
    if (plannerNext) plannerNext.onclick = () => {
        if (window.Planner && plannerNext.textContent === 'Restart') window.Planner.start();
        else if (window.Planner) window.Planner.next();
    };
    if (plannerPdf) plannerPdf.onclick = () => { if (window.Planner) window.Planner.savePdf(); };

    document.getElementById('stat-sites').textContent = '5';
    document.getElementById('stat-bodies').textContent = '3';

    if (window.SiteMetrics) window.SiteMetrics.load();

    if (window.Toast) window.Toast.show('Welcome to Planetary Explorer');

    // Update hero stats from encyclopedia data once loaded.
    fetch('/api/encyclopedia')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
            if (data) {
                const planets = data.planets || [];
                const sites = data.sites || [];
                const moons = data.moons || [];
                document.getElementById('stat-bodies').textContent = planets.length + ' bodies';
                document.getElementById('stat-sites').textContent = sites.length + ' sites';
                document.getElementById('stat-moons').textContent = moons.length + ' moons';
            }
        })
        .catch(() => {});
};