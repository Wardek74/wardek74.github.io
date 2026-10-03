'use strict';

/* ---- STATE ---- */
const DEFAULT_PROJECTS = [
  { name:'MineStats',        url:'https://wardek74.github.io/MineStats/', descKey:'d_minestats', icon:'', accent:'#4dffd4' },
  { name:'Exemple Projet',   url:'https://wardek74.github.io/',           descKey:'d_example',   icon:'', accent:'#c47bff' },
];
const ADMIN_PASSWORD_HASH = 'dc28c229c8d9277291f9ee15d17d20221aa05813bcccf5469c522236a88748bf';
const STORAGE_KEY    = 'wardek_projects_v1';
const LANG_KEY       = 'wardek_lang';
const THEME_KEY      = 'wardek_theme';

let projects      = [];
let editingIndex  = null;
let toastTimer    = null;
let currentLang   = localStorage.getItem(LANG_KEY)  || 'en';
let currentTheme  = localStorage.getItem(THEME_KEY) || 'dark';
let adminUnlocked = false;

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
const adminList      = document.getElementById('admin-project-list');
const adminBadge     = document.getElementById('admin-project-count');
const projectForm    = document.getElementById('project-form');
const formName       = document.getElementById('form-name');
const formUrl        = document.getElementById('form-url');
const formDesc       = document.getElementById('form-desc');
const formIcon       = document.getElementById('form-icon');
const formAccent     = document.getElementById('form-accent');
const formError      = document.getElementById('form-error');
const formSubmitLbl  = document.getElementById('form-submit-label');
const formCancelBtn  = document.getElementById('form-cancel-btn');
const formModeText   = document.getElementById('form-mode-text');
const formModeIcon   = document.getElementById('form-mode-icon');
const toast          = document.getElementById('toast');
const toastMsg       = document.getElementById('toast-message');
const toastIcon      = document.getElementById('toast-icon');
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
const listSectionTitleEl = document.getElementById('list-section-title-text');
const formSectionTitleEl = document.getElementById('form-section-title-text');

/* ---- UTILS ---- */
function loadProjects() {
  try { const r = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (Array.isArray(r) && r.length) return r; } catch(e){}
  return null;
}
function saveProjects() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(projects)); } catch(e){}
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
async function hashPassword(value) {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function showToast(msg, type='success') {
  clearTimeout(toastTimer);
  toastMsg.textContent = msg;
  toastIcon.textContent = type === 'success' ? '✓' : '✕';
  toast.className = `toast toast-${type}`;
  toast.hidden = false;
  void toast.offsetWidth;
  toast.classList.add('is-visible');
  toastTimer = setTimeout(() => { toast.classList.remove('is-visible'); setTimeout(()=>{ toast.hidden=true; },300); }, 3000);
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

  /* Update static elements */
  heroTitleEl.innerHTML    = L.heroTitle;
  heroDescEl.innerHTML     = L.heroDesc;
  searchInput.placeholder  = L.searchPH;
  if (badgeLabelEl) badgeLabelEl.textContent = L.online;
  if (footerCopyEl) footerCopyEl.textContent = `© ${new Date().getFullYear()} Wardek74 — ${L.footerPre}`;
  if (panelTitleEl) panelTitleEl.textContent = L.panelTitle;
  if (emptyTitleEl) emptyTitleEl.textContent = L.emptyTitle;
  if (emptySubEl)   emptySubEl.textContent   = L.emptySub;
  if (listSectionTitleEl) listSectionTitleEl.textContent = L.listTitle;

  /* Update lang button label */
  const btnFlag  = langBtn.querySelector('.lang-flag');
  const btnLabel = langBtn.querySelector('.lang-label');
  if (btnFlag)  btnFlag.textContent  = L.flag;
  if (btnLabel) btnLabel.textContent = L.name;

  /* Mark active in dropdown */
  document.querySelectorAll('.lang-option').forEach(opt => {
    opt.classList.toggle('is-active', opt.dataset.lang === lang);
  });

  /* Re-render grid and admin panel with new translations */
  renderGrid(searchInput.value);
  if (!adminPanel.hidden) renderAdminList();
  updateFormLabels();
}

function updateFormLabels() {
  const L = LANGS[currentLang] || LANGS.en;
  if (formModeText) {
    formModeText.textContent  = editingIndex !== null ? L.editTitle  : L.addTitle;
    formModeIcon.textContent  = editingIndex !== null ? '✎' : '＋';
    formSubmitLbl.textContent = editingIndex !== null ? L.btnSave    : L.btnAdd;
  }
  formName.placeholder = L.phName;
  formUrl.placeholder  = L.phUrl;
  formDesc.placeholder = L.phDesc;
  formIcon.placeholder = L.phIcon;
  formCancelBtn.textContent = L.btnCancel;

  /* Labels */
  const lbl = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  lbl('lbl-name',   L.fName);
  lbl('lbl-url',    L.fUrl);
  lbl('lbl-desc',   L.fDesc);
  lbl('lbl-icon',   L.fIcon);
  lbl('lbl-accent', L.fAccent);
  document.querySelectorAll('.form-hint-opt').forEach(el => el.textContent = L.fOpt);
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

/* ---- ADMIN LIST ---- */
function renderAdminList() {
  adminList.innerHTML = '';
  adminBadge.textContent = projects.length;
  if (projects.length === 0) {
    adminList.innerHTML = `<p style="font-size:.82rem;color:var(--text-muted);text-align:center;padding:1rem 0">—</p>`;
    return;
  }
  projects.forEach((p,i) => {
    const accent = p.accent||'#4db8ff';
    const li = document.createElement('div');
    li.className = 'admin-project-item';
    li.setAttribute('role','listitem');
    let iconHTML;
    if (p.icon) {
      if (isEmoji(p.icon)) {
        iconHTML = `<div class="admin-item-icon-emoji">${esc(p.icon)}</div>`;
      } else {
        iconHTML = `<img src="${esc(p.icon)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover"/>`;
      }
    } else {
      iconHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`;
    }
    li.innerHTML = `
      <div class="admin-item-icon">${iconHTML}</div>
      <div class="admin-item-info">
        <div class="admin-item-name">${esc(p.name)}</div>
        <div class="admin-item-url">${esc(p.url)}</div>
      </div>
      <div class="admin-item-actions">
        <button class="btn btn-reorder" data-action="move-up" data-index="${i}" aria-label="${t('moveUp')}" title="${t('moveUp')}" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="btn btn-reorder" data-action="move-down" data-index="${i}" aria-label="${t('moveDown')}" title="${t('moveDown')}" ${i === projects.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="btn btn-edit" data-action="edit" data-index="${i}" aria-label="Edit ${esc(p.name)}">${t('btnEdit')}</button>
        <button class="btn btn-danger" data-action="delete" data-index="${i}" aria-label="Delete ${esc(p.name)}">✕</button>
      </div>`;
    adminList.appendChild(li);
  });
}

/* ---- ADMIN PANEL ---- */
function openAdminPanel() {
  adminPanel.hidden = false;
  adminPanel.setAttribute('aria-hidden','false');
  adminOverlay.classList.add('is-visible');
  adminOverlay.setAttribute('aria-hidden','false');
  requestAnimationFrame(() => adminPanel.classList.add('is-open'));
  renderAdminList();
  updateFormLabels();
  setTimeout(() => formName.focus(), 350);
}
function closeAdminPanel() {
  adminPanel.classList.remove('is-open');
  adminOverlay.classList.remove('is-visible');
  setTimeout(() => { adminPanel.hidden=true; adminPanel.setAttribute('aria-hidden','true'); adminOverlay.setAttribute('aria-hidden','true'); }, 360);
  resetForm();
}
function resetForm() {
  editingIndex = null;
  projectForm.reset();
  formAccent.value = '#4db8ff';
  formError.hidden = true;
  formCancelBtn.hidden = true;
  formName.classList.remove('is-invalid');
  formUrl.classList.remove('is-invalid');
  updateFormLabels();
}
function fillForm(i) {
  const p = projects[i]; if(!p) return;
  editingIndex    = i;
  formName.value  = p.name   || '';
  formUrl.value   = p.url    || '';
  formDesc.value  = p.desc   || (p.descKey ? t(p.descKey) : '');
  formIcon.value  = p.icon   || '';
  formAccent.value= p.accent || '#4db8ff';
  formError.hidden     = true;
  formCancelBtn.hidden = false;
  updateFormLabels();
  projectForm.scrollIntoView({behavior:'smooth', block:'start'});
  formName.focus();
}

/* ---- FORM VALIDATION ---- */
function validateForm() {
  let ok = true;
  formName.classList.remove('is-invalid');
  formUrl.classList.remove('is-invalid');
  if (!formName.value.trim())  { formName.classList.add('is-invalid'); ok=false; }
  const urlVal = formUrl.value.trim();
  if (!urlVal) { formUrl.classList.add('is-invalid'); ok=false; }
  else { try { new URL(urlVal); } catch(_){ formUrl.classList.add('is-invalid'); ok=false; } }
  if (!ok) { formError.textContent = t('fErr'); formError.hidden = false; }
  return ok;
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
adminBtn.addEventListener('click', () => {
  if (adminUnlocked) { openAdminPanel(); return; }
  const pwd = prompt(t('adminPwd'));
  if (pwd === null) return;
  hashPassword(pwd).then(hash => {
    if (hash === ADMIN_PASSWORD_HASH) {
      adminUnlocked = true;
      openAdminPanel();
      showToast(t('accessOK'));
    } else {
      showToast(t('wrongPwd'), 'error');
    }
  }).catch(() => showToast(t('wrongPwd'), 'error'));
});
adminCloseBtn.addEventListener('click', closeAdminPanel);
adminOverlay.addEventListener('click', closeAdminPanel);
document.addEventListener('keydown', e => { if (e.key==='Escape' && !adminPanel.hidden) closeAdminPanel(); });

/* Form submit */
projectForm.addEventListener('submit', e => {
  e.preventDefault();
  formError.hidden = true;
  if (!validateForm()) return;
  const newProject = { name:formName.value.trim(), url:formUrl.value.trim(), desc:formDesc.value.trim(), icon:formIcon.value.trim(), accent:formAccent.value };
  if (editingIndex !== null) {
    // Preserve descKey if not edited manually
    if (!newProject.desc && projects[editingIndex].descKey) newProject.descKey = projects[editingIndex].descKey;
    projects[editingIndex] = newProject;
    showToast(t('tUpdated')(newProject.name));
  } else {
    projects.push(newProject);
    showToast(t('tAdded')(newProject.name));
  }
  saveProjects(); renderGrid(searchInput.value); renderAdminList(); resetForm();
});

formCancelBtn.addEventListener('click', resetForm);

/* Admin list delegation */
adminList.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]'); if (!btn) return;
  const idx = parseInt(btn.dataset.index, 10);
  if (btn.dataset.action === 'move-up' || btn.dataset.action === 'move-down') {
    const direction = btn.dataset.action === 'move-up' ? -1 : 1;
    const targetIndex = idx + direction;
    if (targetIndex < 0 || targetIndex >= projects.length) return;
    [projects[idx], projects[targetIndex]] = [projects[targetIndex], projects[idx]];
    if (editingIndex === idx) editingIndex = targetIndex;
    else if (editingIndex === targetIndex) editingIndex = idx;
    saveProjects();
    renderGrid(searchInput.value);
    renderAdminList();
    showToast(t('tReordered'));
  }
  else if (btn.dataset.action === 'edit') { fillForm(idx); }
  else if (btn.dataset.action === 'delete') {
    const name = projects[idx]?.name || '?';
    if (confirm(t('delConfirm')(name))) {
      projects.splice(idx,1); saveProjects();
      renderGrid(searchInput.value); renderAdminList();
      showToast(t('tDeleted')(name));
      if (editingIndex === idx) resetForm();
    }
  }
});

/* Color presets */
document.querySelectorAll('.color-preset').forEach(btn => {
  btn.addEventListener('click', () => { formAccent.value = btn.dataset.color; });
});

/* Search */
searchInput.addEventListener('input', () => renderGrid(searchInput.value));

/* ---- INIT ---- */
(function init() {
  if (footerYear) footerYear.textContent = new Date().getFullYear();
  const stored = loadProjects();
  projects = stored || [...DEFAULT_PROJECTS];
  buildLangDropdown();
  applyTheme(currentTheme);
  applyLang(currentLang);
})();
