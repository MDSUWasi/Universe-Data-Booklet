// Core utility functions and shared state
export const State = {
  currentView: 'asteroids',
  currentData: [],
  currentPage: 1,
  pageSize: 50,
  totalPages: 1,
  totalCount: 0,
  isLoading: false,
  searchTerm: '',
  activeFilters: {},
  sortOrder: 'date-desc',
  theme: 'terracota',
};

export const Config = {
  apiBase: '/api',
  themes: {
    terracota: { name: 'Terracota', primary: '#e07a5f', secondary: '#f4a261' },
  },
};

export function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

export function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return '—';
  return Number(num).toLocaleString(undefined, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
}

export function formatInteger(num) {
  if (num === null || num === undefined || isNaN(num)) return '—';
  return Math.round(Number(num)).toLocaleString();
}

export function debounce(fn, delay = 300) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function throttle(fn, limit = 100) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const icons = {
    success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
  };
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span>${escapeHtml(message)}</span>
    <button class="toast-close" aria-label="Dismiss">&times;</button>
  `;
  
  container.appendChild(toast);
  
  requestAnimationFrame(() => toast.classList.add('show'));
  
  const dismiss = () => {
    toast.classList.add('hiding');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  };
  
  toast.querySelector('.toast-close').addEventListener('click', dismiss);
  setTimeout(dismiss, duration);
}

export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    modal.querySelector('.modal-close')?.focus();
  }
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

export function closeAllModals() {
  document.querySelectorAll('.modal-overlay.open').forEach(modal => {
    modal.classList.remove('open');
  });
  document.body.style.overflow = '';
}

export async function fetchApi(endpoint, options = {}) {
  const url = `${Config.apiBase}${endpoint}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

export function createStatCard(icon, label, value, trend = null) {
  const trendHtml = trend ? `
    <div class="stat-card-trend ${trend.positive ? 'positive' : 'negative'}">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="${trend.positive ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}"></polyline>
      </svg>
      <span>${escapeHtml(trend.label)}</span>
    </div>
  ` : '';
  
  return `
    <div class="stat-card">
      <div class="stat-card-icon">${icon}</div>
      <div class="stat-card-content">
        <span class="stat-card-label">${escapeHtml(label)}</span>
        <span class="stat-card-value">${escapeHtml(value)}</span>
        ${trendHtml}
      </div>
    </div>
  `;
}

export function createBadge(text, variant = 'unknown') {
  const variants = {
    hazardous: 'badge-hazardous',
    safe: 'badge-safe',
    high: 'badge-high',
    medium: 'badge-medium',
    low: 'badge-low',
    unknown: 'badge-unknown',
  };
  return `<span class="badge ${variants[variant] || 'badge-unknown'}">${escapeHtml(text)}</span>`;
}

export function animateValue(element, start, end, duration = 600) {
  const startTime = performance.now();
  const animate = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (end - start) * eased;
    element.textContent = Math.round(current).toLocaleString();
    if (progress < 1) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}