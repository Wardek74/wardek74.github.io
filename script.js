'use strict';

/* ---- STATE ---- */
const LEGACY_STORAGE_KEY = 'wardek_projects_v1';
const LANG_KEY       = 'wardek_lang';
const THEME_KEY      = 'wardek_theme';

let projects      = [];
let projectsLoaded = false;
let projectsLoadError = false;
let currentLang   = localStorage.getItem(LANG_KEY)  || 'en';
let currentTheme  = localStorage.getItem(THEME_KEY) || 'dark';

/* Shorthand translation helper */
const t = (key) => (LANGS[currentLang] || LANGS.en)[key] || key;

/* ---- DOM ---- */
const grid           = document.getElementById('projects-grid');
const emptyState     = document.getElementById('empty-state');
const projectCount   = document.getElementById('project-count');
const searchInput    = document.getElementById('search-input');
const adminBtn       = document.getElementById('admin-btn');
const adminPanel     = document.getElementById('admin-panel');
const adminOverlay   = document.getElementById('admin-overlay');
const adminCloseBtn  = document.getElementById('admin-close-btn');
const adminInstructions = document.getElementById('admin-instructions');
const adminEditLink  = document.getElementById('admin-edit-link');
const legacyProjectsNote = document.getElementById('legacy-projects-note');
const exportLocalProjectsBtn = document.getElementById('export-local-projects');
const footerYear     = document.getElementById('footer-year');
const footerCopyEl   = document.getElementById('footer-copy-text');
const langBtn        = document.getElementById('lang-btn');
const langDropdown   = document.getElementById('lang-dropdown');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const heroTitleEl    = document.getElementById('hero-title');
const heroDescEl     = document.getElementById('hero-desc');
const badgeLabelEl   = document.getElementById('badge-label');
const panelTitleEl   = document.getElementById('admin-panel-title-text');
const emptyTitleEl   = document.getElementById('empty-title-text');
const emptySubEl     = document.getElementById('empty-sub-text');

/* ---- UTILS ---- */
async function loadProjects() {
  const response = await fetch('./projects.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load projects: ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data) || data.some(project => !project || typeof project.name !== 'string' || typeof project.url !== 'string')) {
    throw new Error('Project data must be an array of projects with names and URLs');
  }
  return data;
}
function esc(s) { const d=document.createElement('div'); d.appendChild(document.createTextNode(s||'')); return d.innerHTML; }
/* Detect if a string is (or contains) an emoji */
function isEmoji(s) {
  if (!s || typeof s !== 'string') return false;
  try {
    return /\p{Emoji}/u.test(s);
  } catch (e) {
    return /[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(s) || /[\u2600-\u26FF]/.test(s);
  }
}
/* ---- THEME ---- */
function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  const icon = themeToggleBtn.querySelector('.theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
}

/* ---- LANGUAGE ---- */
function applyLang(lang) {
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang;
  const L = LANGS[lang] || LANGS.en;
  const A = ADMIN_COPY[lang] || ADMIN_COPY.en;

  /* Update static elements */
  heroTitleEl.innerHTML    = L.heroTitle;
  heroDescEl.innerHTML     = L.heroDesc;
  searchInput.placeholder  = L.searchPH;
  if (badgeLabelEl) badgeLabelEl.textContent = L.online;
  if (footerCopyEl) footerCopyEl.textContent = `© ${new Date().getFullYear()} Wardek74 — ${L.footerPre}`;
  if (panelTitleEl) panelTitleEl.textContent = L.panelTitle;
  if (emptyTitleEl) emptyTitleEl.textContent = L.emptyTitle;
  if (emptySubEl)   emptySubEl.textContent   = L.emptySub;
  if (adminInstructions) adminInstructions.textContent = A.adminInstructions;
  if (adminEditLink) adminEditLink.textContent = A.adminEditProjects;
  if (legacyProjectsNote) legacyProjectsNote.textContent = A.adminLegacyInstructions;
  if (exportLocalProjectsBtn) exportLocalProjectsBtn.textContent = A.adminExportLocal;

  /* Update lang button label */
  const btnFlag  = langBtn.querySelector('.lang-flag');
  const btnLabel = langBtn.querySelector('.lang-label');
  if (btnFlag)  btnFlag.textContent  = L.flag;
  if (btnLabel) btnLabel.textContent = L.name;

  /* Mark active in dropdown */
  document.querySelectorAll('.lang-option').forEach(opt => {
    opt.classList.toggle('is-active', opt.dataset.lang === lang);
  });

  /* Re-render the grid with the selected language */
  renderGrid(searchInput.value);
}

/* ---- CARD RENDERING ---- */
function getDesc(project) {
  if (project.descKey) return t(project.descKey);   // default projects: translated
  return project.desc || '';                         // user-added: as-is
}

function defaultIconSVG(accent='#4db8ff') {
  return `<svg class="card-icon-default" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" rx="1" fill="${accent}" opacity="0.9"/>
    <rect x="3" y="11" width="7" height="7" rx="1" fill="${accent}" opacity="0.5"/>
    <rect x="11" y="3" width="7" height="7" rx="1" fill="${accent}" opacity="0.5"/>
    <rect x="11" y="11" width="7" height="7" rx="1" fill="${accent}" opacity="0.2"/>
    <rect x="17" y="17" width="4" height="4" rx="1" fill="${accent}" opacity="0.7"/>
  </svg>`;
}

function createCard(project, index) {
  const accent = project.accent || '#4db8ff';
  const desc   = getDesc(project);
  const a      = document.createElement('a');
  a.href        = project.url || '#';
  a.target      = '_blank';
  a.rel         = 'noopener noreferrer';
  a.className   = 'project-card';
  a.setAttribute('role','listitem');
  a.setAttribute('aria-label', `${project.name} — ${desc || 'Open project'}`);
  a.style.setProperty('--card-accent', accent);
  a.style.animationDelay = `${index * 60}ms`;
  let iconHTML;
  if (project.icon) {
    if (isEmoji(project.icon)) {
      iconHTML = `<div class="card-icon-emoji" aria-hidden="true">${esc(project.icon)}</div>`;
    } else {
      iconHTML = `<img class="card-icon-img" src="${esc(project.icon)}" alt="" loading="lazy" onerror="this.parentNode.innerHTML='${defaultIconSVG(accent).replace(/'/g,"\\'")}'"/>`;
    }
  } else {
    iconHTML = defaultIconSVG(accent);
  }
  a.innerHTML = `
    <div class="card-top-bar" aria-hidden="true"></div>
    <div class="card-icon-wrap">${iconHTML}</div>
    <div class="card-body">
      <span class="card-name">${esc(project.name)}</span>
      <span class="card-desc">${esc(desc)}</span>
    </div>
    <svg class="card-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
    </svg>`;
  return a;
}

function renderGrid(filter='') {
  const term     = filter.trim().toLowerCase();
  const filtered = term ? projects.filter(p => (p.name||'').toLowerCase().includes(term) || getDesc(p).toLowerCase().includes(term)) : projects;
  const L        = LANGS[currentLang] || LANGS.en;
  grid.innerHTML = '';
  if (!projectsLoaded) {
    emptyState.hidden = true;
    projectCount.textContent = L.loading;
    return;
  }
  if (projectsLoadError) {
    emptyState.hidden = false;
    emptyTitleEl.textContent = (ADMIN_COPY[currentLang] || ADMIN_COPY.en).loadError;
    emptySubEl.textContent = '';
    projectCount.textContent = (ADMIN_COPY[currentLang] || ADMIN_COPY.en).loadError;
    return;
  }
  emptyTitleEl.textContent = L.emptyTitle;
  emptySubEl.textContent = L.emptySub;
  if (filtered.length === 0) {
    emptyState.hidden = false;
    projectCount.textContent = term ? L.noSearchCount(filter) : L.noProjects;
  } else {
    emptyState.hidden = true;
    filtered.forEach((p,i) => grid.appendChild(createCard(p,i)));
    const n = projects.length;
    const f = filtered.length;
    projectCount.textContent = term
      ? `${f} / ${n}`
      : (typeof L.projectCount === 'function' ? L.projectCount(n) : `${n}`);
  }
}

/* ---- ADMIN PANEL ---- */
function openAdminPanel() {
  adminPanel.hidden = false;
  adminPanel.setAttribute('aria-hidden','false');
  adminOverlay.classList.add('is-visible');
  adminOverlay.setAttribute('aria-hidden','false');
  requestAnimationFrame(() => adminPanel.classList.add('is-open'));
}
function closeAdminPanel() {
  adminPanel.classList.remove('is-open');
  adminOverlay.classList.remove('is-visible');
  setTimeout(() => { adminPanel.hidden=true; adminPanel.setAttribute('aria-hidden','true'); adminOverlay.setAttribute('aria-hidden','true'); }, 360);
}

/* ---- LANG DROPDOWN ---- */
function buildLangDropdown() {
  langDropdown.innerHTML = '';
  Object.entries(LANGS).forEach(([code, L]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lang-option';
    btn.dataset.lang = code;
    btn.setAttribute('aria-label', L.name);
    btn.innerHTML = `<span class="lang-opt-flag">${L.flag}</span><span class="lang-opt-name">${L.name}</span>`;
    btn.addEventListener('click', () => {
      applyLang(code);
      langDropdown.classList.remove('is-open');
    });
    langDropdown.appendChild(btn);
  });
}

/* ---- PARTICLES ---- */
(function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles;
  const COLORS = ['#4db8ff','#c47bff','#4dffd4','#ffd966','#69db7c'];
  const COUNT  = 55;
  function resize() { W=canvas.width=window.innerWidth; H=canvas.height=window.innerHeight; }
  function mk() { return { x:Math.random()*W, y:Math.random()*H, size:Math.random()*2.5+0.5, vx:(Math.random()-.5)*.25, vy:-(Math.random()*.3+.05), alpha:Math.random()*.5+.1, color:COLORS[Math.floor(Math.random()*COLORS.length)] }; }
  function draw() {
    ctx.clearRect(0,0,W,H);
    particles.forEach(p => {
      ctx.globalAlpha=p.alpha; ctx.fillStyle=p.color;
      const s=p.size; ctx.beginPath(); ctx.roundRect(p.x-s/2,p.y-s/2,s,s,s*.25); ctx.fill();
      p.x+=p.vx; p.y+=p.vy;
      if(p.y<-10) Object.assign(p,mk(),{y:H+10,x:Math.random()*W});
      if(p.x<-10) p.x=W+10; if(p.x>W+10) p.x=-10;
    });
    ctx.globalAlpha=1;
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize',resize);
  resize(); particles=Array.from({length:COUNT},mk); draw();
})();

/* ---- EVENTS ---- */

/* Theme toggle */
themeToggleBtn.addEventListener('click', () => applyTheme(currentTheme === 'dark' ? 'light' : 'dark'));

/* Lang button */
langBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  langDropdown.classList.toggle('is-open');
});
document.addEventListener('click', (e) => {
  if (!langBtn.contains(e.target) && !langDropdown.contains(e.target))
    langDropdown.classList.remove('is-open');
});

/* Admin */
adminBtn.addEventListener('click', openAdminPanel);
adminCloseBtn.addEventListener('click', closeAdminPanel);
adminOverlay.addEventListener('click', closeAdminPanel);
document.addEventListener('keydown', e => { if (e.key==='Escape' && !adminPanel.hidden) closeAdminPanel(); });

function getLegacyProjects() {
  try {
    const stored = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    return Array.isArray(stored) && stored.length ? stored : null;
  } catch (error) {
    console.error('Unable to read projects saved in this browser:', error);
    return null;
  }
}
exportLocalProjectsBtn.addEventListener('click', () => {
  const legacyProjects = getLegacyProjects();
  if (!legacyProjects) return;
  const blob = new Blob([JSON.stringify(legacyProjects, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const download = document.createElement('a');
  download.href = url;
  download.download = 'projects.json';
  download.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

/* Search */
searchInput.addEventListener('input', () => renderGrid(searchInput.value));

/* ---- INIT ---- */
(function init() {
  if (footerYear) footerYear.textContent = new Date().getFullYear();
  const legacyProjects = getLegacyProjects();
  exportLocalProjectsBtn.hidden = !legacyProjects;
  legacyProjectsNote.hidden = !legacyProjects;
  buildLangDropdown();
  applyTheme(currentTheme);
  applyLang(currentLang);
  loadProjects().then(loadedProjects => {
    projects = loadedProjects;
    projectsLoaded = true;
    renderGrid(searchInput.value);
  }).catch(error => {
    console.error('Unable to load the shared project list:', error);
    projectsLoadError = true;
    projectsLoaded = true;
    renderGrid(searchInput.value);
  });
})();
