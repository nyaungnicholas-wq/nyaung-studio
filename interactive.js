/* ============================================================
   NICHOLAS — interactive layer
   1) 3D tilt + cursor spotlight on cards (+ cover parallax shine)
   2) Scroll-driven section indicator (right rail)
   3) Sound + haptic micro-feedback on interactions (with mute)
   4) Command palette (⌘K / Ctrl+K / "/")
   Pairs with premium.js (cursor glow + magnetic), scene.js (drag-to-explore).
   ============================================================ */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const EMAIL = 'nyaungnicholas@gmail.com';

  /* ---------------------------------------------------------
     SVG icons
  --------------------------------------------------------- */
  const I = {
    page: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8l9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    sndOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14"/></svg>',
    sndOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/></svg>',
  };

  /* ---------------------------------------------------------
     3) Sound + haptic feedback
  --------------------------------------------------------- */
  let actx = null;
  let soundOn = localStorage.getItem('ns_sound') !== 'off';
  function ctxOK() { if (actx) return actx; try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } return actx; }
  function blip(kind) {
    if (!soundOn) return; const c = ctxOK(); if (!c) return; if (c.state === 'suspended') c.resume();
    const now = c.currentTime, o = c.createOscillator(), g = c.createGain();
    const f = kind === 'open' ? 520 : kind === 'select' ? 660 : 410;
    o.type = kind === 'tap' ? 'triangle' : 'sine';
    o.frequency.setValueAtTime(f, now);
    if (kind === 'open') o.frequency.exponentialRampToValueAtTime(f * 1.5, now + 0.08);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(kind === 'tap' ? 0.045 : 0.06, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    o.connect(g).connect(c.destination); o.start(now); o.stop(now + 0.11);
  }
  function haptic(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  function feedback(kind, ms) { blip(kind); haptic(ms || 6); }

  function initFeedback() {
    // tap on meaningful interactions (capture so it fires before navigation)
    document.addEventListener('pointerdown', (e) => {
      const el = e.target.closest && e.target.closest('a, button, .proj, .filter, .cmdk-opt, .ap-chip, .sn-dot, summary');
      if (el) feedback('tap', 6);
    }, true);
    // mute toggle
    const tog = document.createElement('button');
    tog.className = 'snd-toggle'; tog.type = 'button';
    tog.setAttribute('aria-label', 'Toggle interface sound');
    tog.setAttribute('aria-pressed', String(soundOn));
    const paint = () => { tog.innerHTML = soundOn ? I.sndOn : I.sndOff; tog.classList.toggle('off', !soundOn); tog.setAttribute('aria-pressed', String(soundOn)); };
    paint();
    tog.addEventListener('click', () => { soundOn = !soundOn; localStorage.setItem('ns_sound', soundOn ? 'on' : 'off'); paint(); if (soundOn) { ctxOK(); feedback('select', 8); } });
    document.body.appendChild(tog);
  }

  /* ---------------------------------------------------------
     1) Tilt + spotlight + cover parallax shine
  --------------------------------------------------------- */
  function addGlow(card) {
    if (card.dataset.ioGlow) return; card.dataset.ioGlow = '1';
    card.classList.add('io-card');
    if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
    const g = document.createElement('span'); g.className = 'io-glow'; g.setAttribute('aria-hidden', 'true');
    card.appendChild(g);
  }
  function addShine(cover) {
    if (cover.dataset.ioShine) return; cover.dataset.ioShine = '1';
    const s = document.createElement('span'); s.className = 'cover-shine'; s.setAttribute('aria-hidden', 'true');
    cover.appendChild(s);
  }
  function vars(el, e) {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
    el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    return { px, py };
  }
  function addTilt(card, max) {
    addGlow(card);
    const cover = card.querySelector('.proj-top');
    if (cover) addShine(cover);
    if (card.dataset.ioTilt) return; card.dataset.ioTilt = '1';
    const em = card.querySelector('.proj-emblem');
    card.addEventListener('pointermove', (e) => {
      const { px, py } = vars(card, e);
      const rx = (0.5 - py) * max, ry = (px - 0.5) * max;
      card.style.transition = 'transform .08s linear';
      card.style.transform = `perspective(950px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-6px)`;
      if (em) { em.style.transition = 'transform .12s ease'; em.style.transform = `translate3d(${((px - 0.5) * 14).toFixed(1)}px, ${((py - 0.5) * 14 - 3).toFixed(1)}px, 0) scale(1.04)`; }
    });
    card.addEventListener('pointerleave', () => {
      card.style.transition = ''; card.style.transform = '';
      if (em) { em.style.transition = ''; em.style.transform = ''; }
    });
  }
  function addSpot(card) {
    addGlow(card);
    if (card.dataset.ioSpot) return; card.dataset.ioSpot = '1';
    card.addEventListener('pointermove', (e) => vars(card, e));
  }
  function addCaseCover(cover) {
    addShine(cover);
    if (cover.dataset.ioCC) return; cover.dataset.ioCC = '1';
    cover.classList.add('io-cover');
    const em = cover.querySelector('.proj-emblem');
    cover.addEventListener('pointermove', (e) => {
      const { px, py } = vars(cover, e);
      if (em) { em.style.transition = 'transform .12s ease'; em.style.transform = `translate3d(${((px - 0.5) * 18).toFixed(1)}px, ${((py - 0.5) * 18).toFixed(1)}px, 0)`; }
    });
    cover.addEventListener('pointerleave', () => { if (em) { em.style.transition = ''; em.style.transform = ''; } });
  }
  function enhance() {
    document.querySelectorAll('.proj').forEach((c) => addTilt(c, 6));
    document.querySelectorAll('.bento-card, .feature, .cta-card, .post, .tcard, .case-nav a').forEach(addSpot);
    document.querySelectorAll('.case-cover').forEach(addCaseCover);
  }
  function initTiltSpot() {
    if (reduce || !fine) return;
    enhance();
    ['proj-grid', 'featured-grid'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) new MutationObserver(enhance).observe(el, { childList: true });
    });
  }

  /* ---------------------------------------------------------
     2) Section indicator (right rail)
  --------------------------------------------------------- */
  function initSectionNav() {
    const main = document.getElementById('top'); if (!main) return;
    const secs = Array.from(main.querySelectorAll(':scope > section')).map((el) => {
      if (getComputedStyle(el).display === 'none') return null; // skip hidden (e.g. empty testimonials)
      const lab = ((el.querySelector('.eyebrow') || {}).textContent || (el.querySelector('h1, h2') || {}).textContent || '').trim();
      return lab ? { el, label: lab.length > 26 ? lab.slice(0, 24) + '…' : lab } : null;
    }).filter(Boolean);
    if (secs.length < 3) return;
    secs.forEach((s, i) => { if (!s.el.id) s.el.id = 'sec-' + i; });
    const nav = document.createElement('nav');
    nav.className = 'section-nav'; nav.setAttribute('aria-label', 'Page sections');
    nav.innerHTML = secs.map((s, i) => `<button type="button" class="sn-dot" data-i="${i}" aria-label="Go to ${s.label.replace(/"/g, '')}"><span class="sn-label">${s.label}</span></button>`).join('');
    document.body.appendChild(nav);
    const dots = Array.from(nav.querySelectorAll('.sn-dot'));
    const setActive = (i) => dots.forEach((d, j) => { d.classList.toggle('active', j === i); d.setAttribute('aria-current', j === i ? 'true' : 'false'); });
    dots.forEach((d, i) => d.addEventListener('click', () => {
      const el = secs[i].el;
      if (window.__lenis && window.__lenis.scrollTo) window.__lenis.scrollTo(el, { offset: -30 });
      else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }));
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => { if (e.isIntersecting) { const i = secs.findIndex((s) => s.el === e.target); if (i >= 0) setActive(i); } });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    secs.forEach((s) => io.observe(s.el));
    setActive(0);
  }

  /* ---------------------------------------------------------
     4) Command palette
  --------------------------------------------------------- */
  function buildItems() {
    const pages = [
      { label: 'Home', sub: 'Start here', href: 'index.html', icon: I.page },
      { label: 'About', sub: 'Nicholas Nyaung', href: 'about.html', icon: I.page },
      { label: 'Work', sub: 'All 26 projects', href: 'work.html', icon: I.page },
      { label: 'Services', sub: 'What I do + pricing', href: 'services.html', icon: I.page },
      { label: 'Writing', sub: 'Notes from the build', href: 'writing.html', icon: I.page },
      { label: 'Now', sub: 'Current focus', href: 'now.html', icon: I.page },
      { label: 'Uses', sub: 'Tools & stack', href: 'uses.html', icon: I.page },
      { label: 'Contact', sub: 'Start a project', href: 'contact.html', icon: I.page },
    ];
    const projects = (window.NS_PROJECTS || []).map((p) => ({
      label: p.name, sub: p.category + (p.status === 'Live' ? ' · Live' : ''), href: 'work-' + p.slug + '.html', icon: I.box,
    }));
    const actions = [
      { label: 'Start a project', sub: 'Go to contact', href: 'contact.html', icon: I.bolt },
      { label: 'Ask the Studio Assistant', sub: 'Open the chat', icon: I.bolt, act: () => { const b = document.querySelector('.assistant-btn'); if (b) b.click(); } },
      { label: 'Email Nicholas', sub: EMAIL, href: 'mailto:' + EMAIL, icon: I.bolt },
    ];
    return [...pages, ...projects, ...actions];
  }

  function initPalette() {
    const items = buildItems();
    const wrap = document.createElement('div');
    wrap.className = 'cmdk'; wrap.id = 'cmdk'; wrap.hidden = true;
    wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-label', 'Quick navigation');
    wrap.innerHTML = `
      <div class="cmdk-box">
        <div class="cmdk-input-wrap">
          ${I.search}
          <input id="cmdk-input" type="text" placeholder="Jump to a page or project…" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-label="Search pages and projects" />
          <kbd class="cmdk-esc">Esc</kbd>
        </div>
        <ul class="cmdk-list" id="cmdk-list" role="listbox" aria-label="Results"></ul>
        <div class="cmdk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span></div>
      </div>`;
    document.body.appendChild(wrap);

    const hint = document.createElement('button');
    hint.className = 'cmdk-hint'; hint.type = 'button'; hint.setAttribute('aria-label', 'Open quick navigation');
    hint.innerHTML = `${I.search}<span>Quick jump</span>${fine ? '<kbd>⌘ K</kbd>' : ''}`;
    document.body.appendChild(hint);

    const input = wrap.querySelector('#cmdk-input');
    const list = wrap.querySelector('#cmdk-list');
    let view = items, sel = 0, opener = null;

    const render = () => {
      if (!view.length) { list.innerHTML = '<li class="cmdk-empty">No matches — try another word, or email ' + EMAIL + '</li>'; return; }
      list.innerHTML = view.map((it, i) => `
        <li class="cmdk-opt" role="option" id="cmdk-opt-${i}" aria-selected="${i === sel}" data-i="${i}">
          <span class="ico">${it.icon}</span>
          <span class="meta"><span class="lbl">${it.label}</span><span class="sb">${it.sub}</span></span>
        </li>`).join('');
      const cur = list.querySelector('[aria-selected="true"]');
      if (cur) { cur.scrollIntoView({ block: 'nearest' }); input.setAttribute('aria-activedescendant', cur.id); }
    };
    const filter = () => {
      const q = input.value.trim().toLowerCase();
      view = q ? items.filter((it) => (it.label + ' ' + it.sub).toLowerCase().includes(q)) : items;
      sel = 0; render();
    };
    const activate = (it) => { if (!it) return; close(); if (it.act) it.act(); else if (it.href) window.location.href = it.href; };

    const open = () => {
      if (!wrap.hidden) return;
      opener = document.activeElement;
      wrap.hidden = false; document.body.style.overflow = 'hidden';
      input.value = ''; filter();
      setTimeout(() => input.focus(), 30);
    };
    function close() {
      if (wrap.hidden) return;
      wrap.hidden = true; document.body.style.overflow = '';
      if (opener && opener.focus) opener.focus();
    }

    input.addEventListener('input', filter);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, view.length - 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); activate(view[sel]); }
      else if (e.key === 'Tab') { e.preventDefault(); }
    });
    list.addEventListener('mousemove', (e) => { const li = e.target.closest('.cmdk-opt'); if (li && +li.dataset.i !== sel) { sel = +li.dataset.i; render(); } });
    list.addEventListener('click', (e) => { const li = e.target.closest('.cmdk-opt'); if (li) activate(view[+li.dataset.i]); });
    wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
    hint.addEventListener('click', open);

    document.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === 'k') { e.preventDefault(); wrap.hidden ? open() : close(); return; }
      if (e.key === 'Escape' && !wrap.hidden) { e.preventDefault(); close(); return; }
      if (e.key === '/' && wrap.hidden && !/^(input|textarea|select)$/i.test((e.target.tagName || '')) && !e.target.isContentEditable && !e.metaKey && !e.ctrlKey) {
        e.preventDefault(); open();
      }
    });
  }

  function init() { initTiltSpot(); initSectionNav(); initPalette(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
