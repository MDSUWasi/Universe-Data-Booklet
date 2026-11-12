// Map View Module
let map = null;
let markers = {};
let selectedSite = null;
let currentLayer = 'earth';

const SITES = {
  earth: [
    { id: 'kerguelen', name: 'Kerguelen Plateau', lat: -49.5, lng: 70.0, body: 'Earth', type: 'earth' },
    { id: 'mcmurdo', name: 'McMurdo Dry Valleys', lat: -77.8, lng: 166.7, body: 'Earth', type: 'earth' },
    { id: 'axel', name: 'Axel Heiberg Island', lat: 79.5, lng: -90.0, body: 'Earth', type: 'earth' },
  ],
  moon: [
    { id: 'moon_south', name: 'Lunar South Pole', lat: -89.5, lng: 0.0, body: 'Moon', type: 'moon' },
  ],
  mars: [
    { id: 'jezero', name: 'Jezero Crater', lat: 18.4, lng: 77.5, body: 'Mars', type: 'mars' },
  ],
};

const SITE_DETAILS = {
  kerguelen: { area: '125 km²', slope: '1.2°', rough: '0.8m', p95: '2.1m', elevation: '500m' },
  mcmurdo: { area: '89 km²', slope: '0.9°', rough: '0.5m', p95: '1.4m', elevation: '1200m' },
  axel: { area: '67 km²', slope: '1.5°', rough: '1.1m', p95: '2.8m', elevation: '200m' },
  moon_south: { area: '234 km²', slope: '2.1°', rough: '1.8m', p95: '3.9m', elevation: '1500m' },
  jezero: { area: '156 km²', slope: '1.8°', rough: '1.3m', p95: '3.2m', elevation: '-2600m' },
};

export function initMap() {
  if (typeof L === 'undefined') {
    console.warn('Leaflet not loaded');
    return;
  }
  
  const mapContainer = document.getElementById('map');
  if (!mapContainer || mapContainer._leaflet_map) return;
  
  map = L.map('map', {
    center: [0, 0],
    zoom: 2,
    minZoom: 1,
    maxZoom: 8,
    zoomControl: false,
    attributionControl: false,
  });
  
  mapContainer._leaflet_map = map;
  
  // Base layers
  const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 8,
  });
  
  const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 8,
    attribution: 'Esri',
  });
  
  const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 8,
    attribution: 'OpenTopoMap',
  });
  
  const layers = { dark: darkLayer, satellite: satelliteLayer, topo: topoLayer };
  let currentBaseLayer = 'dark';
  darkLayer.addTo(map);
  
  // Custom icons
  const createIcon = (color, label) => L.divIcon({
    className: 'custom-marker',
    html: `<div style="width: 16px; height: 16px; border-radius: 50%; background: ${color}; border: 3px solid #030712; box-shadow: 0 0 0 2px ${color}, 0 2px 8px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 8px; color: #030712; font-weight: bold;">${label}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
  
  const icons = {
    earth: createIcon('#4E8C6E', '●'),
    moon: createIcon('#C9821A', '○'),
    mars: createIcon('#F08080', '▲'),
  };
  
  // Add markers
  function addMarkers(body) {
    if (markers[body]) return;
    
    const layer = L.layerGroup();
    SITES[body].forEach(site => {
      const marker = L.marker([site.lat, site.lng], { icon: icons[site.type] })
        .bindTooltip(site.name, { permanent: false, direction: 'top', offset: [0, -15] })
        .on('click', () => selectSite(site.id));
      layer.addLayer(marker);
    });
    
    markers[body] = layer;
    if (currentLayer === body || currentLayer === 'all') {
      layer.addTo(map);
    }
  }
  
  // Layer buttons
  document.querySelectorAll('#modal-map [data-layer]').forEach(btn => {
    btn.addEventListener('click', () => {
      const layer = btn.dataset.layer;
      
      document.querySelectorAll('#modal-map [data-layer]').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
        b.style.background = '';
        b.style.borderColor = '';
        b.style.color = '';
      });
      
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      
      if (layer === 'earth') {
        btn.style.background = 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.1))';
        btn.style.borderColor = 'rgba(34,197,94,0.3)';
        btn.style.color = 'var(--color-success-400)';
      } else if (layer === 'moon') {
        btn.style.background = 'linear-gradient(135deg, rgba(107,114,128,0.2), rgba(107,114,128,0.1))';
        btn.style.borderColor = 'rgba(107,114,128,0.3)';
        btn.style.color = 'var(--color-space-400)';
      } else if (layer === 'mars') {
        btn.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.1))';
        btn.style.borderColor = 'rgba(239,68,68,0.3)';
        btn.style.color = 'var(--color-danger-400)';
      }
      
      switchLayer(layer);
    });
  });
  
  function switchLayer(layer) {
    currentLayer = layer;
    
    Object.values(markers).forEach(m => map.removeLayer(m));
    
    if (layer === 'all') {
      Object.values(markers).forEach(m => m.addTo(map));
      map.fitBounds(L.featureGroup(Object.values(markers)).getBounds(), { padding: [50, 50] });
    } else {
      addMarkers(layer);
      markers[layer].addTo(map);
      map.fitBounds(markers[layer].getBounds(), { padding: [50, 50] });
    }
    
    updateSiteList(layer);
  }
  
  function updateSiteList(layer) {
    const container = document.getElementById('map-sites-list');
    if (!container) return;
    
    let sites = [];
    if (layer === 'all') {
      sites = [...SITES.earth, ...SITES.moon, ...SITES.mars];
    } else {
      sites = SITES[layer] || [];
    }
    
    container.innerHTML = sites.map(site => `
      <button class="btn btn-ghost btn-sm" style="justify-content: flex-start; text-align: left; width: 100%; padding: 0.625rem 0.875rem;" data-site="${site.id}">
        <span style="font-size: 1rem;">${site.type === 'earth' ? '●' : site.type === 'moon' ? '○' : '▲'}</span>
        <span style="font-weight: 500;">${site.name}</span>
        <span style="font-size: 0.6875rem; color: var(--color-space-500);">${site.body}</span>
      </button>
    `).join('');
    
    container.querySelectorAll('[data-site]').forEach(btn => {
      btn.addEventListener('click', () => selectSite(btn.dataset.site));
    });
  }
  
  function selectSite(siteId) {
    selectedSite = siteId;
    const site = [...SITES.earth, ...SITES.moon, ...SITES.mars].find(s => s.id === siteId);
    if (!site) return;
    
    // Update detail panel
    const detail = document.getElementById('map-detail');
    const nameEl = document.getElementById('map-detail-name');
    const bodyEl = document.getElementById('map-detail-body');
    const metricsEl = document.getElementById('map-detail-metrics');
    
    if (detail && nameEl && bodyEl && metricsEl) {
      nameEl.textContent = site.name;
      bodyEl.textContent = `${site.body} • ${site.lat.toFixed(2)}°, ${site.lng.toFixed(2)}°`;
      
      const details = SITE_DETAILS[siteId] || {};
      metricsEl.innerHTML = Object.entries(details).map(([key, value]) => `
        <div><span style="color: var(--color-space-500);">${key}</span><br><strong>${value}</strong></div>
      `).join('');
      
      detail.style.transform = 'translateY(0)';
      detail.style.opacity = '1';
    }
    
    // Center map
    map.setView([site.lat, site.lng], 5, { animate: true });
  }
  
  // Fit all button
  document.getElementById('map-fit')?.addEventListener('click', () => {
    const allLayers = Object.values(markers).filter(m => m.getLayers().length > 0);
    if (allLayers.length > 0) {
      const group = L.featureGroup(allLayers);
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  });
  
  // Basemap toggle
  let baseLayerIndex = 0;
  const baseLayers = ['dark', 'satellite', 'topo'];
  document.getElementById('map-tiles')?.addEventListener('click', () => {
    map.removeLayer(layers[baseLayers[baseLayerIndex]]);
    baseLayerIndex = (baseLayerIndex + 1) % baseLayers.length;
    layers[baseLayers[baseLayerIndex]].addTo(map);
  });
  
  // Close detail
  document.getElementById('map-detail-close')?.addEventListener('click', () => {
    const detail = document.getElementById('map-detail');
    if (detail) {
      detail.style.transform = 'translateY(100%)';
      detail.style.opacity = '0';
    }
    selectedSite = null;
  });
  
  // Initialize with Earth layer
  addMarkers('earth');
  markers.earth.addTo(map);
  updateSiteList('earth');
  
  // Handle modal open - invalidate size
  const modal = document.getElementById('modal-map');
  if (modal) {
    const observer = new MutationObserver(() => {
      if (modal.classList.contains('open')) {
        setTimeout(() => map.invalidateSize(), 100);
      }
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
  }
  
  return { map, switchLayer, selectSite };
}