// Theme management
import { State, Config } from './state.js';

const THEME_STORAGE_KEY = 'udb-theme';
const SIDEBAR_STORAGE_KEY = 'udb-sidebar-open';

export function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY) || 'terracota';
  applyTheme(saved);
  setupThemeButtons();
}

function applyTheme(theme) {
  State.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  
  document.querySelectorAll('.theme-option').forEach(btn => {
    const isActive = btn.dataset.theme === theme;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-checked', isActive);
  });
  
  // Update nav brand gradient based on theme
  const themeConfig = Config.themes[theme] || Config.themes.dark;
  document.documentElement.style.setProperty('--theme-primary', themeConfig.primary);
  document.documentElement.style.setProperty('--theme-secondary', themeConfig.secondary);
}

function setupThemeButtons() {
  document.querySelectorAll('.theme-option').forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
  });
}

// Sidebar management
export function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const menuBtn = document.getElementById('btn-menu');
  const navItems = document.querySelectorAll('.nav-item[data-view], .nav-item[data-modal]');
  
  let isOpen = false;
  
  function open() {
    isOpen = true;
    sidebar.classList.add('open');
    overlay.classList.add('visible');
    menuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    localStorage.setItem(SIDEBAR_STORAGE_KEY, 'true');
  }
  
  function close() {
    isOpen = false;
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    localStorage.setItem(SIDEBAR_STORAGE_KEY, 'false');
  }
  
  function toggle() {
    isOpen ? close() : open();
  }
  
  menuBtn.addEventListener('click', toggle);
  overlay.addEventListener('click', close);
  
  // Close sidebar when clicking a nav item on mobile
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 1024) close();
    });
  });
  
  // Restore sidebar state on desktop
  if (window.innerWidth > 1024) {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved === 'true') open();
  }
  
  // Handle resize
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) {
      overlay.classList.remove('visible');
      document.body.style.overflow = '';
    }
  });
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) close();
  });
  
  return { open, close, toggle };
}

// Navigation handling
export function initNavigation(onViewChange, onModalOpen) {
  const navItems = document.querySelectorAll('.nav-item[data-view], .nav-item[data-modal]');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      const modal = item.dataset.modal;
      
      // Update active state
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      if (view) {
        onViewChange(view);
      } else if (modal) {
        onModalOpen(modal);
      }
    });
  });
  
  // Tab buttons in toolbar
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn[data-tab]').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      onViewChange(btn.dataset.tab);
    });
  });
}

// Starfield background
export function initStarfield() {
  const canvas = document.getElementById('stars-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  let stars = [];
  let animationId;
  let width, height;
  
  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    createStars();
  }
  
  function createStars() {
    stars = [];
    const count = Math.min(200, Math.floor((width * height) / 8000));
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5,
        brightness: Math.random(),
        speed: Math.random() * 0.05 + 0.01,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }
  
  function draw() {
    ctx.fillStyle = '#fef2ea';
    ctx.fillRect(0, 0, width, height);
    
    stars.forEach(star => {
      const alpha = (Math.sin(Date.now() * 0.001 * star.speed + star.phase) + 1) * 0.5 * star.brightness + 0.2;
      ctx.globalAlpha = Math.max(0.1, Math.min(1, alpha));
      ctx.fillStyle = star.brightness > 0.7 ? '#70d6ff' : (star.brightness > 0.4 ? '#f6d365' : '#fff');
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.globalAlpha = 1;
    animationId = requestAnimationFrame(draw);
  }
  
  resize();
  draw();
  window.addEventListener('resize', resize);
  
  return () => cancelAnimationFrame(animationId);
}

// Navbar scroll effect
export function initNavbar() {
  const navbar = document.querySelector('.navbar');
  let lastScroll = 0;
  
  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    
    if (currentScroll > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
  }, { passive: true });
}

// Refresh button
export function initRefreshButton(onRefresh) {
  const btn = document.getElementById('btn-refresh');
  if (!btn) return;
  
  btn.addEventListener('click', async () => {
    btn.classList.add('loading');
    btn.disabled = true;
    const icon = btn.querySelector('svg');
    icon.style.animation = 'spin 1s linear infinite';
    
    try {
      await onRefresh();
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
      icon.style.animation = '';
    }
  });
}

// Add spin animation for refresh
const style = document.createElement('style');
style.textContent = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .nav-btn.loading svg { animation: spin 1s linear infinite; }
`;
document.head.appendChild(style);