/* MapViewer part 3: detail panel + terrain-lab opener.
   Classic script: extends window.MapViewer. */
'use strict';

(function () {
    const M = window.MapViewer;

    M.renderDetail = function (site) {
        const el = document.getElementById('map-detail');
        if (!el) return;
        const body = window.PLANET_COLORS[site.body];
        el.innerHTML =
            '<div class="map-detail-head">' +
            '<div>' +
            '<h3 style="color:' + body + '">' + site.name + '</h3>' +
            '<span style="font-size:0.76rem;color:var(--ink-mute)">' + site.body + ' \u2022 ' + site.analogy + '</span>' +
            '</div>' +
            '</div>' +
            '<div class="map-detail-body">' +
            '<div class="map-detail-stat"><span class="mds-label">Flat area</span><span class="mds-value">' + window.fmt(site.area) + ' km\u00b2</span></div>' +
            '<div class="map-detail-stat"><span class="mds-label">Mean rough</span><span class="mds-value">' + window.fmt(site.meanRough) + ' m</span></div>' +
            '<div class="map-detail-stat"><span class="mds-label">p95 rough</span><span class="mds-value">' + window.fmt(site.p95Rough) + ' m</span></div>' +
            '<div class="map-detail-stat"><span class="mds-label">vs Moon</span><span class="mds-value">' + site.vsMoon + '%</span></div>' +
            '</div>' +
            '<p class="map-detail-desc">' + site.description + '</p>' +
            '<div class="map-detail-actions">' +
            '<button class="btn-primary btn-small" type="button" onclick="MapViewer.focusOnSite(\'' + site.id + '\')">\ud83d\uddfa Focus on map</button>' +
            '<button class="btn-ghost btn-small" type="button" onclick="window.UI.openModal(\'compare\')">\ud83c\udfea Compare</button>' +
            '<button class="btn-ghost btn-small" type="button" onclick="MapViewer.openTerrainFor(\'' + site.id + '\')">\u26f0\ufe0f View 3D terrain</button>' +
            '</div>';
    };

    M.openTerrainFor = function (siteId) {
        const site = window.SITE_DATA[siteId];
        if (!site) return;
        window.UI.openModal('terrain');
        if (window.TerrainLab) {
            const bodySelect = document.getElementById('terrain-body');
            if (bodySelect) {
                bodySelect.value = site.body;
                window.TerrainLab.populateSites(site.body);
            }
            const siteSelect = document.getElementById('terrain-site');
            if (siteSelect) {
                siteSelect.value = siteId;
                window.TerrainLab.loadSelectedSite();
            }
        }
    };

    M.clearDetail = function () {
        const el = document.getElementById('map-detail');
        if (el) el.innerHTML = '<div class="map-detail-empty">Select a site or map marker to view its terrain metrics.</div>';
    };
})();