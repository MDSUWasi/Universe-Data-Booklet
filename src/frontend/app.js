// Main Application Entry Point
import { State, Config, showToast, escapeHtml, openModal, closeModal, fetchApi } from './js/modules/core/state.js';
import { initTheme, initSidebar, initNavigation, initStarfield, initNavbar, initRefreshButton } from './js/modules/core/ui.js';
import { loadData, initSearch, initFilters, setCurrentView, getCurrentView, getCurrentData, showDetail } from './js/modules/core/data.js';
import { OrbitControls } from './lib/OrbitControls.js';
if (typeof THREE !== 'undefined') {
  THREE.OrbitControls = OrbitControls;
}

// Feature modules
import { initMap } from './js/modules/map/map.js';
import { initEncyclopedia } from './js/modules/encyclopedia/encyclopedia.js';
import { initRealtime } from './js/modules/realtime/realtime.js';
import { initTerrain } from './js/modules/terrain/terrain.js';
import { initPatches } from './js/modules/patches/patches.js';
import { initScale } from './js/modules/scale/scale.js';
import { initCalculator } from './js/modules/calculator/calculator.js';
import { initSimilarity } from './js/modules/planner/planner.js';
import { initCompare } from './js/modules/compare/compare.js';
import { initStudy } from './js/modules/study/study.js';
import { initExplorer } from './js/modules/explorer/explorer.js';

// Modal management
const MODAL_MAP = {
  map: 'modal-map',
  encyclopedia: 'modal-encyclopedia',
  realtime: 'modal-realtime',
  terrain: 'modal-terrain',
  patches: 'modal-patches',
  scale: 'modal-scale',
  calculator: 'modal-calculator',
  planner: 'modal-planner',
  compare: 'modal-compare',
  study: 'modal-study',
  explorer: 'modal-explorer',
};

const MODAL_INIT = {
  'modal-map': initMap,
  'modal-encyclopedia': initEncyclopedia,
  'modal-realtime': initRealtime,
  'modal-terrain': initTerrain,
  'modal-patches': initPatches,
  'modal-scale': initScale,
  'modal-calculator': initCalculator,
  'modal-planner': initSimilarity,
  'modal-compare': initCompare,
  'modal-study': initStudy,
  'modal-explorer': initExplorer,
};

const modalInitialized = new Set();

// Load planetary terrain sites (Earth / Moon / Mars) for the Map View feature.
async function loadSiteData() {
  try {
    const payload = await fetchApi('/api/encyclopedia/sites');
    const sites = payload && payload.sites ? payload.sites : [];
    const data = {};
    sites.forEach(s => {
      data[s.id] = {
        id: s.id,
        name: s.name,
        body: s.body,
        region: s.region || '',
        lat: s.lat,
        lng: s.lng,
        area: s.area_km2 || s.area,
        meanRough: s.mean_rough_m || s.meanRough,
        p95Rough: s.p95_rough_m || s.p95Rough,
        maxRough: s.max_rough_m || s.maxRough,
        siteClass: s.siteClass || '',
        description: s.description || '',
      };
    });
    window.SITE_DATA = data;
  } catch (error) {
    console.warn('Map View: failed to load site data:', error.message);
    window.SITE_DATA = window.SITE_DATA || {};
  }
}

function openModalById(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  closeAllModals();
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  
  // Initialize modal content if not already done
  if (!modalInitialized.has(modalId) && MODAL_INIT[modalId]) {
    try {
      MODAL_INIT[modalId]();
      modalInitialized.add(modalId);
    } catch (error) {
      console.error(`Failed to initialize ${modalId}:`, error);
      showToast(`Failed to load ${modalId.replace('modal-', '')}`, 'error');
    }
  } else if (modalId === 'modal-compare' && MODAL_INIT[modalId]) {
    try { MODAL_INIT[modalId](); } catch (e) { console.error(e); }
  }
  
  // Focus close button for accessibility
  setTimeout(() => {
    modal.querySelector('.modal-close')?.focus();
  }, 100);
}

function closeModalById(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay.open').forEach(modal => {
    modal.classList.remove('open');
  });
  document.body.style.overflow = '';
}

// Global functions for inline handlers
window.openModal = (modalKey) => {
  const modalId = MODAL_MAP[modalKey];
  if (modalId) openModalById(modalId);
};

window.closeModal = (modalKey) => {
  const modalId = MODAL_MAP[modalKey];
  if (modalId) closeModalById(modalId);
};

window.showDetail = showDetail;
window.showToast = showToast;
window.State = State;
window.switchTab = setCurrentView;
window.App = {
  loadCurrentView: () => loadData(getCurrentView(), true),
  refreshData: () => loadData(getCurrentView(), true),
};

// Initialize application
async function initApp() {
  // Core initialization
  initTheme();
  initSidebar();
  initStarfield();
  initNavbar();
  
  // Set up navigation
  initNavigation(
    (view) => {
      setCurrentView(view);
      loadData(view, true);
    },
    (modalKey) => {
      const modalId = MODAL_MAP[modalKey];
      if (modalId) openModalById(modalId);
    }
  );
  
  // Set up search and filters
  initSearch(() => loadData(getCurrentView(), true));
  initFilters(() => loadData(getCurrentView(), true));
  
  // Refresh button
  initRefreshButton(() => loadData(getCurrentView(), true));
  
  // Load map site data (Earth / Moon / Mars) for the Map View feature
  await loadSiteData();

  // Load initial data
  await loadData('asteroids', true);
  
  // Modal close handlers
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });
  
  // Close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
    
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('search-input')?.focus();
    }
    
    // Numbers for quick view switching
    if (e.key === '1' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const input = document.activeElement;
      if (!input || input.tagName !== 'INPUT') {
        setCurrentView('asteroids');
        loadData('asteroids', true);
      }
    }
    if (e.key === '2' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const input = document.activeElement;
      if (!input || input.tagName !== 'INPUT') {
        setCurrentView('exoplanets');
        loadData('exoplanets', true);
      }
    }
  });
  
  // Handle window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      // Trigger chart resizes
      window.dispatchEvent(new Event('resize'));
    }, 100);
  });
  
  console.log('🌌 Universe Data Booklet initialized');
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Export for debugging
window.UniverseDataBooklet = {
  State,
  Config,
  openModal: openModalById,
  closeModal: closeModalById,
  closeAllModals,
  loadData,
  getCurrentView,
  getCurrentData,
};