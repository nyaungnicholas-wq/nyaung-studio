/* ============================================================
   NICHOLAS — page logic (multi-page aware)
   Nav/footer/preloader live in components.js.
   ============================================================ */
const PROJECTS = window.NS_PROJECTS || [];

const STATUS_CLASS = { 'Live': 'live', 'Built': 'built', 'Prototype': 'proto', 'Backtest only': 'proto', 'In progress': 'proto' };
const ICONS = {
  check: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  ext: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
  result: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>',
  liveExt: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>',
};
function liveUrl(u) { return u.startsWith('http') ? u : 'https://' + u; }

/* clean category icons replace the amateur "big initial" emblems */
const CAT_ICON = {
  'SaaS Product': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M6.5 6.5h.01"/><path d="M9 6.5h.01"/></svg>',
  'AI Agent': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7z"/><circle cx="18" cy="17.5" r="1.6"/></svg>',
  'Quant / Trading': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 6"/><polyline points="15 6 21 6 21 12"/></svg>',
  'Website': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.7 2.6 2.7 15.4 0 18M12 3c-2.7 2.6-2.7 15.4 0 18"/></svg>',
  'Content Engine': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10.5 9.2v5.6l4.5-2.8z"/></svg>',
  'Developer Tool': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3"/><path d="M13 15h4"/></svg>',
};
const catIcon = (p) => CAT_ICON[p.category] || CAT_ICON['Developer Tool'];
/* cohesive, category-based cover tint (replaces random per-slug hues) */
const COVER_CLASS = { 'SaaS Product': 'cat-saas', 'AI Agent': 'cat-ai', 'Quant / Trading': 'cat-quant', 'Website': 'cat-web', 'Content Engine': 'cat-content', 'Developer Tool': 'cat-tool' };
const coverClass = (p) => COVER_CLASS[p.category] || 'cat-tool';
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function hueFor(slug) { let h = 0; for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 360; return h; }
function gradFor(slug) { const h = hueFor(slug), h2 = (h + 48) % 360; return `linear-gradient(135deg, hsl(${h} 60% 20%), hsl(${h2} 55% 11%))`; }
function meshFor(slug) {
  const h = hueFor(slug);
  return `radial-gradient(circle at 28% 25%, hsla(${h},60%,52%,0.42), transparent 46%),
          radial-gradient(circle at 75% 70%, hsla(${(h + 60) % 360},58%,50%,0.34), transparent 50%),
          radial-gradient(circle at 60% 20%, hsla(${(h + 300) % 360},55%,48%,0.26), transparent 46%)`;
}
function initials(name) {
  const words = name.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return (name.slice(0, 2) || '??').toUpperCase();
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function cardHTML(p, i) {
  const st = STATUS_CLASS[p.status] || 'built';
  const tags = (p.techStack || []).slice(0, 4).map(t => `<span class="proj-tag">${t}</span>`).join('');
  const d = (i % 3) + 1;
  return `
    <div class="proj reveal" data-d="${d}">
      <div class="proj-top cover ${coverClass(p)}">
        <span class="proj-emblem">${catIcon(p)}</span>
        ${(p.status === 'Live' && p.url) ? `<a class="proj-live-link" href="${liveUrl(p.url)}" target="_blank" rel="noopener" aria-label="Visit ${p.name} live site (opens in new tab)">Live ${ICONS.liveExt}</a>` : ''}
      </div>
      <div class="proj-body">
        <div class="proj-meta">
          <span class="proj-cat">${p.category}</span>
          <span class="status ${st}"><span class="sd"></span>${p.status}</span>
        </div>
        <h3><button type="button" class="proj-trigger" data-slug="${p.slug}" aria-haspopup="dialog">${p.name}</button></h3>
        <p class="tagline">${p.tagline}</p>
        <p class="desc">${p.description}</p>
        ${p.result ? `<p class="proj-result">${ICONS.result}<span>${p.result}</span></p>` : ''}
        <div class="proj-tags">${tags}</div>
      </div>
    </div>`;
}

function renderGrid(container, list) {
  container.innerHTML = list.map((p, i) => cardHTML(p, i)).join('');
  bindProjectCards();
  observeReveals(container);
}

/* ---------- Work page: filters + full grid ---------- */
function initWorkGrid() {
  const grid = document.getElementById('proj-grid');
  if (!grid) return;
  const bar = document.getElementById('filters');
  let current = 'All';
  const draw = () => renderGrid(grid, current === 'All' ? PROJECTS : PROJECTS.filter(p => p.category === current));
  if (bar) {
    const cats = ['All', ...Array.from(new Set(PROJECTS.map(p => p.category)))];
    bar.innerHTML = cats.map((c, i) => `<button type="button" class="filter${i === 0 ? ' active' : ''}" data-cat="${c}" aria-pressed="${i === 0}">${c}</button>`).join('');
    bar.querySelectorAll('.filter').forEach(btn => btn.addEventListener('click', () => {
      bar.querySelectorAll('.filter').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true');
      current = btn.dataset.cat; draw();
    }));
  }
  draw();
}

/* ---------- Home page: featured grid ---------- */
function initFeatured() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  const flagships = PROJECTS.filter(p => p.tier === 'flagship');
  const rest = PROJECTS.filter(p => p.tier !== 'flagship');
  const featured = [...flagships, ...rest].slice(0, 6);
  renderGrid(grid, featured);
}

/* ---------- Testimonials (renders only when real quotes exist) ---------- */
function initTestimonials() {
  const sec = document.getElementById('testimonials'); if (!sec) return;
  const list = window.NS_TESTIMONIALS || [];
  if (!list.length) return; // section stays hidden until you add real quotes
  const grid = sec.querySelector('#testimonials-grid');
  // Testimonial fields come from data — escape them before they enter innerHTML so a
  // stray < or " in a pasted quote can't inject markup. Only allow http(s) urls.
  const escH = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => { const s = String(u || ''); const full = /^https?:\/\//i.test(s) ? s : 'https://' + s; return /^https?:\/\//i.test(full) ? full : ''; };
  grid.innerHTML = list.map(t => {
    const href = safeUrl(t.url);
    return `
    <figure class="tcard reveal">
      <blockquote>“${escH(t.quote)}”</blockquote>
      <figcaption>
        <span class="tname">${escH(t.name)}</span>
        ${t.title ? `<span class="ttitle">${escH(t.title)}</span>` : ''}
        ${href ? `<a href="${escH(href)}" target="_blank" rel="noopener" class="tlink">${escH(href.replace(/^https?:\/\//, ''))}</a>` : ''}
      </figcaption>
    </figure>`;
  }).join('');
  sec.style.display = '';
  observeReveals(grid);
}

/* ---------- Modal ---------- */
let _lastFocus = null;
function bindProjectCards() {
  document.querySelectorAll('.proj-trigger').forEach(btn => {
    if (btn.dataset.bound) return; btn.dataset.bound = '1';
    btn.addEventListener('click', () => { _lastFocus = btn; openModal(btn.dataset.slug); });
  });
}
function getFocusable(root) {
  return Array.from(root.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])')).filter(el => !el.disabled && el.offsetParent !== null);
}
function trapFocus(e) {
  if (e.key !== 'Tab') return;
  const f = getFocusable(document.getElementById('modal-body')); if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
function openModal(slug) {
  const p = PROJECTS.find(x => x.slug === slug); if (!p) return;
  const back = document.getElementById('modal-backdrop'); const body = document.getElementById('modal-body'); if (!back || !body) return;
  const st = STATUS_CLASS[p.status] || 'built';
  const highlights = (p.highlights || []).map(h => `<li>${ICONS.check}<span>${h}</span></li>`).join('');
  const tech = (p.techStack || []).map(t => `<span class="proj-tag">${t}</span>`).join('');
  const metrics = p.metrics || [];
  const metricsHTML = metrics.length ? `<div class="metric-strip">${metrics.map(m => `<div class="metric"><span class="mv">${m.value}</span><span class="ml">${m.label}</span></div>`).join('')}</div>` : '';
  const caseLink = `<a class="btn btn-primary" href="work-${p.slug}.html">View full case study</a>`;
  const live = p.url ? `<a class="btn btn-ghost" href="${liveUrl(p.url)}" target="_blank" rel="noopener">Visit live ${ICONS.ext}</a>` : '';
  const link = caseLink + live;
  body.innerHTML = `
    <button class="modal-close" aria-label="Close dialog" onclick="closeModal()">
      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
      <div class="m-emblem ${coverClass(p)}" aria-hidden="true">${catIcon(p)}</div>
      <div><span class="m-cat">${p.category}</span><h3 id="modal-title" style="margin:2px 0 0">${p.name}</h3></div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px"><span class="status ${st}"><span class="sd"></span>${p.status}</span></div>
    <p class="m-desc">${p.description}</p>
    ${metricsHTML}
    ${(p.problem || p.outcome) ? `<div class="m-case">${p.problem ? `<div><h5>The problem</h5><p>${p.problem}</p></div>` : ''}${p.outcome ? `<div><h5>What I built</h5><p>${p.outcome}</p></div>` : ''}</div>` : ''}
    ${p.approach ? `<h4>How it works</h4><p class="m-desc m-approach">${p.approach}</p>` : ''}
    ${p.result ? `<div class="m-result">${ICONS.result}<span>${p.result}</span></div>` : ''}
    <h4>Highlights</h4>
    <ul class="m-list">${highlights}</ul>
    <h4>Built with</h4>
    <div class="proj-tags" style="margin-top:0">${tech}</div>
    <div style="margin-top:26px;display:flex;gap:12px;flex-wrap:wrap">${link}</div>`;
  back.setAttribute('aria-labelledby', 'modal-title');
  back.classList.add('open');
  document.body.style.overflow = 'hidden';
  document.querySelectorAll('body > *:not(#modal-backdrop)').forEach(el => el.setAttribute('inert', ''));
  document.addEventListener('keydown', trapFocus);
  const first = getFocusable(body)[0]; if (first) first.focus();
}
function closeModal() {
  const back = document.getElementById('modal-backdrop'); if (!back) return;
  back.classList.remove('open');
  document.body.style.overflow = '';
  document.querySelectorAll('body > *[inert]').forEach(el => el.removeAttribute('inert'));
  document.removeEventListener('keydown', trapFocus);
  if (_lastFocus) { _lastFocus.focus(); _lastFocus = null; }
}
window.closeModal = closeModal;

/* ---------- Scroll reveal (+ hard fallback so content never stays hidden) ---------- */
let revealObserver;
function observeReveals(root = document) {
  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealObserver.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
  }
  root.querySelectorAll('.reveal:not(.in)').forEach(el => revealObserver.observe(el));
}
function revealFallback() {
  // guarantee everything becomes visible even if IO never fires
  setTimeout(() => document.querySelectorAll('.reveal:not(.in)').forEach(el => el.classList.add('in')), 1600);
}

/* ---------- Counters ---------- */
function initCounters() {
  const els = document.querySelectorAll('[data-count]'); if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, target = parseFloat(el.dataset.count), suffix = el.dataset.suffix || '';
      const dec = (el.dataset.count.split('.')[1] || '').length;
      if (prefersReduced) { el.textContent = target.toFixed(dec) + suffix; io.unobserve(el); return; }
      let t0 = null; const dur = 1400;
      const step = (ts) => { if (!t0) t0 = ts; const k = Math.min((ts - t0) / dur, 1); const eased = 1 - Math.pow(1 - k, 3); el.textContent = (target * eased).toFixed(dec) + suffix; if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step); io.unobserve(el);
    });
  }, { threshold: 0.5 });
  els.forEach(el => io.observe(el));
}

/* ---------- Contact form (validation + success) ----------
   Delivery order: 1) CONTACT_ENDPOINT (Resend serverless fn) → 2) Formspree → 3) mailto.
   Each falls back to the next if it isn't configured or fails. */
const CONTACT_ENDPOINT = '/api/contact'; // Resend via serverless fn (api/contact.js); env vars set in Vercel
const FORMSPREE_ID = '';     // ← or set a Formspree form id (e.g. 'xqkdgabc') for a no-backend option
function initContactForm() {
  const form = document.getElementById('contact-form'); if (!form) return;
  const note = document.getElementById('form-note');
  const setError = (input, msg) => {
    const err = document.getElementById(input.id + '-error');
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) err.textContent = msg || '';
    return !msg;
  };
  const validate = () => {
    let firstBad = null;
    const name = form.querySelector('#f-name'), email = form.querySelector('#f-email'), msg = form.querySelector('#f-message');
    const okName = setError(name, name.value.trim() ? '' : 'Please enter your name');
    const okEmail = setError(email, /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim()) ? '' : 'Please enter a valid email');
    const okMsg = setError(msg, msg.value.trim() ? '' : 'Tell me a bit about the project');
    if (!okName) firstBad = name; else if (!okEmail) firstBad = email; else if (!okMsg) firstBad = msg;
    if (firstBad) firstBad.focus();
    return okName && okEmail && okMsg;
  };
  const showOk = (txt) => { if (note) { note.textContent = txt; note.classList.add('show'); } };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const data = new FormData(form);
    const g = (k) => (data.get(k) || '').toString().trim();

    // 1) Resend via serverless function (branded email from your own domain)
    if (CONTACT_ENDPOINT) {
      try {
        const res = await fetch(CONTACT_ENDPOINT, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: g('name'), email: g('email'), type: g('type'), budget: g('budget'), message: g('message'), company: g('company') }),
        });
        if (res.ok) { form.reset(); showOk("Got it — I'll read this and reply within 1–2 business days."); return; }
      } catch (_) { /* fall through to the next method */ }
    }

    if (FORMSPREE_ID) {
      try {
        const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, { method: 'POST', headers: { Accept: 'application/json' }, body: data });
        if (res.ok) { form.reset(); showOk("Got it — I'll read this and reply within 1–2 business days."); }
        else showOk('Something went wrong — please email nyaungnicholas@gmail.com directly.');
      } catch (_) { showOk('Network error — please email nyaungnicholas@gmail.com directly.'); }
      return;
    }
    // no backend configured yet → open the visitor's mail client
    const subject = `Project inquiry — ${g('type') || 'Nicholas'}${g('name') ? ' — ' + g('name') : ''}`;
    const body = `Name: ${g('name')}\nEmail: ${g('email')}\nProject type: ${g('type')}\nBudget / timeline: ${g('budget')}\n\n${g('message')}`;
    window.location.href = `mailto:nyaungnicholas@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    showOk("Opening your email app… if nothing happens, email nyaungnicholas@gmail.com directly.");
  });
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initWorkGrid();
  initFeatured();
  initTestimonials();
  observeReveals();
  revealFallback();
  initCounters();
  initContactForm();
  const back = document.getElementById('modal-backdrop');
  if (back) {
    back.addEventListener('click', e => { if (e.target.id === 'modal-backdrop') closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  }
});
