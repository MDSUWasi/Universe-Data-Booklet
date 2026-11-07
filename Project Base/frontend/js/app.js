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

    const discRun = document.getElementById('disc-run');
    const discRand = document.getElementById('disc-random');
    if (discRun) discRun.onclick = () => {
        const lat = parseFloat(document.getElementById('disc-lat').value);
        const lng = parseFloat(document.getElementById('disc-lng').value);
        if (isNaN(lat) || isNaN(lng)) { if (window.Toast) window.Toast.show('Please enter valid coordinates'); return; }
        if (window.Discovery) window.Discovery.analyze(lat, lng);
    };
    if (discRand) discRand.onclick = () => { if (window.Discovery) window.Discovery.random(); };

    const retryBtn = document.getElementById('map-retry');
    if (retryBtn) retryBtn.addEventListener('click', () => {
        if (window.MapViewer) window.MapViewer.retryTiles();
    });

    // Mission Planner: wire the wizard buttons (independent of the step UI).
    const plannerBack = document.getElementById('planner-back');
    const plannerNext = document.getElementById('planner-next');
    if (plannerBack) plannerBack.onclick = () => { if (window.Planner) window.Planner.back(); };
    if (plannerNext) plannerNext.onclick = () => {
        if (window.Planner && plannerNext.textContent === 'Restart') window.Planner.start();
        else if (window.Planner) window.Planner.next();
    };

    document.getElementById('stat-sites').textContent = '5';
    document.getElementById('stat-bodies').textContent = '3';

    if (window.SiteMetrics) window.SiteMetrics.load();

    if (window.Toast) window.Toast.show('Welcome to Planetary Analog Explorer');
};