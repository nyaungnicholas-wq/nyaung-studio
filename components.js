/* ============================================================
   NICHOLAS — shared chrome injected on every page
   Nav (with active state), footer, and the first-visit preloader.
   ============================================================ */
(function () {
  const PAGE = document.documentElement.dataset.page || 'home';
  const GREETING = window.NS_GREETING || "Welcome to Nicholas.";
  const EMAIL = 'nyaungnicholas@gmail.com';
  // ← Fill these in to show GitHub / LinkedIn icons in the footer (independent verification = trust).
  const SOCIAL = { github: 'https://github.com/nyaungnicholas-wq', linkedin: '' };
  const ICON = {
    mail: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>',
    github: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 22 12c0-5.52-4.48-10-10-10z"/></svg>',
    linkedin: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.34 18.34V10.4H5.67v7.94zM7 9.24a1.55 1.55 0 1 0 0-3.1 1.55 1.55 0 0 0 0 3.1zm11.34 9.1v-4.36c0-2.33-1.25-3.42-2.91-3.42a2.51 2.51 0 0 0-2.28 1.25V10.4h-2.67v7.94h2.67v-4.2c0-1.11.21-2.18 1.58-2.18s1.37 1.26 1.37 2.25v4.13z"/></svg>',
  };

  const LINKS = [
    { href: 'index.html', label: 'Home', page: 'home' },
    { href: 'about.html', label: 'About', page: 'about' },
    { href: 'work.html', label: 'Work', page: 'work' },
    { href: 'services.html', label: 'Services', page: 'services' },
    { href: 'writing.html', label: 'Writing', page: 'writing' },
    { href: 'contact.html', label: 'Contact', page: 'contact' },
  ];

  const navLinks = LINKS.map(l => `<a href="${l.href}"${l.page === PAGE ? ' aria-current="page" class="active"' : ''}>${l.label}</a>`).join('');
  const menuLinks = LINKS.map(l => `<a href="${l.href}"${l.page === PAGE ? ' class="active"' : ''}>${l.label}</a>`).join('') +
    `<a href="contact.html">Start a project</a>`;

  /* ---------- Nav ---------- */
  const header = document.createElement('header');
  header.className = 'nav';
  header.innerHTML = `
    <nav class="nav-inner" aria-label="Primary">
      <a href="index.html" class="logo">
        <span class="mark">N</span>
        <span>Nicholas</span>
      </a>
      <div class="nav-links">${navLinks}</div>
      <div class="nav-cta">
        <a href="contact.html" class="btn btn-primary">Start a project</a>
        <button class="nav-toggle" id="nav-toggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="mobile-menu">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>
        </button>
      </div>
    </nav>`;
  const menu = document.createElement('div');
  menu.className = 'mobile-menu';
  menu.id = 'mobile-menu';
  menu.innerHTML = menuLinks;

  /* ---------- Footer ---------- */
  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.innerHTML = `
    <div class="wrap">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="index.html" class="logo"><span class="mark">N</span><span>Nicholas</span></a>
          <p>A one-person product &amp; AI studio. I take software from a rough idea to something live, and I do the whole thing myself.</p>
        </div>
        <div class="footer-cols">
          <div class="footer-col">
            <h3>Studio</h3>
            <a href="work.html">Work</a>
            <a href="services.html">Services</a>
            <a href="about.html">About</a>
            <a href="writing.html">Writing</a>
            <a href="now.html">Now</a>
            <a href="uses.html">Uses</a>
          </div>
          <div class="footer-col">
            <h3>Engage</h3>
            <a href="contact.html">Start a project</a>
            <a href="mailto:${EMAIL}">Email</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© <span id="year">2026</span> Nicholas. All rights reserved.</span>
        <div class="socials">
          <a href="mailto:${EMAIL}" aria-label="Email">${ICON.mail}</a>
          ${SOCIAL.github ? `<a href="${SOCIAL.github}" target="_blank" rel="noopener" aria-label="GitHub">${ICON.github}</a>` : ''}
          ${SOCIAL.linkedin ? `<a href="${SOCIAL.linkedin}" target="_blank" rel="noopener" aria-label="LinkedIn">${ICON.linkedin}</a>` : ''}
        </div>
      </div>
    </div>`;

  /* ---------- Insert chrome ---------- */
  function mount() {
    // PWA / Apple touch icons — added here so every page gets them without editing each <head>
    const addLink = (rel, href) => { if (document.querySelector(`link[rel="${rel}"]`)) return; const l = document.createElement('link'); l.rel = rel; l.href = href; document.head.appendChild(l); };
    addLink('apple-touch-icon', 'assets/apple-touch-icon.png');
    addLink('manifest', 'site.webmanifest');
    menu.setAttribute('aria-hidden', 'true');
    const skip = document.createElement('a');
    skip.className = 'skip-link'; skip.href = '#top'; skip.textContent = 'Skip to content';

    document.body.insertBefore(header, document.body.firstChild);
    document.body.insertBefore(menu, header.nextSibling);
    document.body.insertBefore(skip, document.body.firstChild);
    document.body.appendChild(footer);

    const main = document.getElementById('top');
    if (main) main.setAttribute('tabindex', '-1');
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();

    /* nav scrolled state */
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    /* mobile menu (accessible) */
    const toggle = document.getElementById('nav-toggle');
    const setMenu = (open) => {
      menu.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
    };
    toggle.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); toggle.focus(); }
    });

    /* trust line under every CTA (pairs proof with the ask) */
    document.querySelectorAll('.cta-card .cta-actions').forEach((a) => {
      if (a.nextElementSibling && a.nextElementSibling.classList.contains('cta-trust')) return;
      const p = document.createElement('p');
      p.className = 'cta-trust';
      p.innerHTML = '<span class="sd"></span> You get a scoped plan &amp; a fixed price before you commit · Replies in 1–2 business days · A client site is live at <a href="https://shanty-realestate.com" target="_blank" rel="noopener">shanty-realestate.com</a>';
      a.after(p);
    });

    /* ---------- Preloader: first visit only ---------- */
    if (PAGE === 'home' && !sessionStorage.getItem('ns_greeted')) {
      showPreloader();
    }
  }

  function showPreloader() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pre = document.createElement('div');
    pre.className = 'preloader';
    pre.setAttribute('role', 'dialog');
    pre.setAttribute('aria-modal', 'true');
    pre.setAttribute('aria-label', 'Welcome to Nicholas');
    pre.innerHTML = `
      <div class="pre-inner">
        <div class="pre-mark">N</div>
        <p class="pre-greeting">${GREETING}</p>
        <div class="pre-bar"><span></span></div>
      </div>
      <button class="pre-skip" aria-label="Skip intro">Skip</button>`;
    document.body.appendChild(pre);
    document.body.classList.add('pre-lock');
    sessionStorage.setItem('ns_greeted', '1');

    const onKey = (e) => { if (e.key === 'Escape') dismiss(); };
    const dismiss = () => {
      if (pre.classList.contains('done')) return;
      pre.classList.add('done');
      document.body.classList.remove('pre-lock');
      document.removeEventListener('keydown', onKey);
      const firstLink = document.querySelector('.nav-links a');
      if (firstLink) firstLink.focus();
      setTimeout(() => pre.remove(), 700);
    };
    const skipBtn = pre.querySelector('.pre-skip');
    skipBtn.addEventListener('click', dismiss);
    pre.addEventListener('click', (e) => { if (e.target === pre) dismiss(); });
    document.addEventListener('keydown', onKey);
    skipBtn.focus();
    setTimeout(dismiss, reduce ? 400 : 2600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
