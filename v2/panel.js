(function () {
  const panel = document.getElementById('panel');
  if (!panel) return;

  const body = document.getElementById('panel-body');
  const crumb = document.getElementById('panel-crumb');
  const closeBtn = document.getElementById('panel-close');
  const scroller = document.getElementById('panel-scroll');
  const main = document.querySelector('main');
  const root = document.documentElement;

  const P = Array.isArray(window.NS_PROJECTS) ? window.NS_PROJECTS : [];
  const SELECTED = P.filter(p => p.selected).sort((a, b) => Number(a.selected) - Number(b.selected));
  const IMG = {
    taxlens: 'v2/img/work-taxlens.jpg',
    'shanty-realestate': 'v2/img/work-shanty.jpg',
    lotline: 'v2/img/work-lotline.jpg',
    signaldeck: 'v2/img/work-signaldeck.jpg'
  };

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad2 = n => String(n).padStart(2, '0');

  let depth = 0, lastFocus = null, savedTitle = '';

  function renderProject(p) {
    const i = SELECTED.indexOf(p);
    crumb.textContent = i >= 0 ? `Project ${pad2(i + 1)} / ${pad2(SELECTED.length)}` : 'Archive';

    const cat = esc(p.category), status = esc(p.status), name = esc(p.name), tagline = esc(p.tagline);
    const desc = esc(p.description), result = esc(p.result), problem = esc(p.problem), approach = esc(p.approach), outcome = esc(p.outcome);
    const url = (p.url && String(p.url).startsWith('https://')) ? esc(p.url) : null;
    const imgSrc = IMG[p.slug];
    const highlights = Array.isArray(p.highlights) ? p.highlights : [];
    const metrics = Array.isArray(p.metrics) ? p.metrics : [];
    const techStack = Array.isArray(p.techStack) ? p.techStack : [];

    let html = '';
    if (cat || status) html += `<p class="pn-kicker">${cat}${cat && status ? ' · ' : ''}${status}</p>`;
    html += `<h2 class="pn-title" id="panel-title">${name}</h2>`;
    if (tagline) html += `<p class="pn-lede">${tagline}</p>`;
    if (imgSrc) html += `<figure class="pn-media"><img src="${esc(imgSrc)}" alt="${esc(name)} — screenshot" width="1440" height="900" loading="lazy" decoding="async"></figure>`;

    if (desc || result || techStack.length) {
      html += `<div class="pn-grid">`;
      if (desc) html += `<div class="pn-cell"><h3 class="pn-h">Project</h3><p>${desc}</p></div>`;
      if (result) html += `<div class="pn-cell"><h3 class="pn-h">Result</h3><p>${result}</p></div>`;
      if (techStack.length) {
        html += `<div class="pn-cell"><h3 class="pn-h">Stack</h3><ul class="pn-list">`;
        techStack.forEach(t => html += `<li>${esc(t)}</li>`);
        html += `</ul></div>`;
      }
      html += `</div>`;
    }

    if (metrics.length) {
      html += `<div class="pn-stats">`;
      metrics.forEach(m => html += `<div class="pn-stat"><span class="pn-stat-v">${esc(m.value)}</span><span class="pn-stat-l">${esc(m.label)}</span></div>`);
      html += `</div>`;
    }

    if (problem) html += `<section class="pn-sec"><h3 class="pn-h">The problem</h3><p>${problem}</p></section>`;
    if (approach) html += `<section class="pn-sec"><h3 class="pn-h">The approach</h3><p>${approach}</p></section>`;
    if (outcome) html += `<section class="pn-sec"><h3 class="pn-h">The outcome</h3><p>${outcome}</p></section>`;

    if (highlights.length) {
      html += `<section class="pn-sec"><h3 class="pn-h">Highlights</h3><ul class="pn-list">`;
      highlights.forEach(h => html += `<li>${esc(h)}</li>`);
      html += `</ul></section>`;
    }

    html += `<p class="pn-links">`;
    if (url) html += `<a class="more" href="${url}" target="_blank" rel="noopener">&gt; Open the live site</a> `;
    html += `<a class="more" href="#/archive">&gt; All projects</a> <a class="more" href="#/contact">&gt; Start a project</a></p>`;

    if (i >= 0) {
      const prev = SELECTED[(i - 1 + SELECTED.length) % SELECTED.length];
      const next = SELECTED[(i + 1) % SELECTED.length];
      html += `<nav class="pn-pager" aria-label="More projects">`;
      html += `<a class="more" href="#/work/${esc(prev.slug)}">&lt; Prev · ${esc(prev.name)}</a>`;
      html += `<a class="more" href="#/work/${esc(next.slug)}">Next · ${esc(next.name)} &gt;</a>`;
      html += `</nav>`;
    }

    body.innerHTML = html;
  }

  function renderArchive() {
    crumb.textContent = 'Archive';
    const cats = [];
    P.forEach(p => { if (p.category && !cats.includes(p.category)) cats.push(p.category); });

    let html = `<p class="pn-kicker">All work</p><h2 class="pn-title" id="panel-title">Every project</h2><p class="pn-lede">${P.length} projects, grouped by what they are.</p>`;
    let n = 0;
    cats.forEach(cat => {
      html += `<h3 class="pn-group">${esc(cat)}</h3><ol class="pn-rows">`;
      P.filter(p => p.category === cat).forEach(p => {
        n++;
        html += `<li><a class="pn-row" href="#/work/${esc(p.slug)}"><span class="pn-row-n">[${pad2(n)}]</span><span class="pn-row-name">${esc(p.name)}</span><span class="pn-row-tag">${esc(p.tagline)}</span><span class="pn-row-cat">${esc(p.status)}</span></a></li>`;
      });
      html += `</ol>`;
    });
    body.innerHTML = html;
  }

  function renderStatic(name) {
    const tpl = document.getElementById('tpl-' + name);
    if (!tpl) return false;
    body.replaceChildren(tpl.content.cloneNode(true));
    const h = body.querySelector('h1, h2');
    if (h) h.id = 'panel-title';
    crumb.textContent = name;
    if (name === 'contact') wireContactForm(body.querySelector('form'));
    return true;
  }

  function route() {
    const h = location.hash;
    if (!h.startsWith('#/')) { hide(); return; }
    const [kind, slug] = decodeURIComponent(h.slice(2)).split('/');
    if (kind === 'contact') {
      // the contact form lives on the page now: close any panel, unlock the map tour, and scroll there
      depth = 0; clearHash(); hide();
      document.dispatchEvent(new CustomEvent('v2:release'));
      const sec = document.getElementById('contact');
      if (sec) sec.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    if (kind === 'work') {
      const p = P.find(x => x.slug === slug);
      p ? renderProject(p) : renderArchive();
    } else if (kind === 'archive') {
      renderArchive();
    } else if (!renderStatic(kind)) {
      clearHash(); hide(); return;
    }
    show();
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const href = a.getAttribute('href') || '';
    // a "#/" route pushes one history entry (unless it is the route already showing)
    if (href.startsWith('#/') && href !== location.hash) depth++;
    // a plain homepage anchor (#work, #hero...) clicked while a panel is open: close it, main.js does the scroll
    else if (href.startsWith('#') && !href.startsWith('#/') && root.classList.contains('panel-open')) close();
  }, true);

  // closing a panel walks history back; don't let the browser restore an old scroll position on the way
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('hashchange', route);
  route();
  // the contact form is part of the page itself now
  const pageForm = document.getElementById('contact-form');
  if (pageForm) wireContactForm(pageForm);

  function clearHash() {
    history.replaceState(null, '', location.pathname + location.search);
  }

  function close() {
    if (depth > 0) {
      const d = depth; depth = 0; history.go(-d);
    } else {
      clearHash(); hide();
    }
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && root.classList.contains('panel-open') && !root.classList.contains('menu-open')) close();
    if (e.key === 'Tab' && root.classList.contains('panel-open')) {
      const list = [...panel.querySelectorAll('a[href], button:not([disabled]), input:not([type=hidden]):not([tabindex="-1"]), select, textarea, [tabindex]:not([tabindex="-1"])')].filter(el => el.offsetParent !== null);
      if (!list.length) return;
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  closeBtn.addEventListener('click', close);

  function show() {
    const wasOpen = root.classList.contains('panel-open');
    scroller.scrollTop = 0;
    const titleEl = document.getElementById('panel-title');
    const titleText = titleEl ? titleEl.textContent : '';
    if (!wasOpen) savedTitle = document.title;   // capture the homepage title before replacing it
    document.title = `${titleText} — Nicholas Nyaung`;

    if (!wasOpen) {
      lastFocus = document.activeElement;
      panel.hidden = false;
      void panel.offsetWidth;
      root.classList.add('panel-open');
      root.classList.remove('menu-open');
      if (main) main.inert = true;
      closeBtn.focus({ preventScroll: true });
    } else {
      closeBtn.focus({ preventScroll: true });
    }
  }

  function hide() {
    if (!root.classList.contains('panel-open')) return;
    root.classList.remove('panel-open');
    if (main) main.inert = false;
    document.title = savedTitle;
    setTimeout(() => {
      if (!root.classList.contains('panel-open')) {
        panel.hidden = true;
        body.replaceChildren();
      }
    }, 420);
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    depth = 0;
  }

  function wireContactForm(form) {
    if (!form || form.dataset.wired === '1') return;
    form.dataset.wired = '1';

    const CONTACT_ENDPOINT = '/api/contact';
    const FORMSPREE_ID = '';

    const nameEl = form.querySelector('#f-name');
    const emailEl = form.querySelector('#f-email');
    const messageEl = form.querySelector('#f-message');
    const typeEl = form.querySelector('#f-type');
    const budgetEl = form.querySelector('#f-budget');
    const companyEl = form.querySelector('#f-company');
    const noteEl = form.querySelector('#form-note');
    const submitBtn = form.querySelector('[type=submit]');

    const setError = (input, msg) => {
      const err = document.getElementById(input.id + '-error');
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) err.textContent = msg || '';
      return !msg;
    };

    const validate = () => {
      let ok = true, firstBad = null;
      ok = setError(nameEl, nameEl.value.trim() ? '' : 'Please enter your name') && ok;
      if (!ok && !firstBad) firstBad = nameEl;
      ok = setError(emailEl, /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailEl.value) ? '' : 'Please enter a valid email') && ok;
      if (!ok && !firstBad) firstBad = emailEl;
      ok = setError(messageEl, messageEl.value.trim() ? '' : 'Tell me a bit about the project') && ok;
      if (!ok && !firstBad) firstBad = messageEl;
      if (firstBad) firstBad.focus({ preventScroll: true });
      return ok;
    };

    const showOk = txt => {
      noteEl.textContent = txt;
      noteEl.classList.add('show');
    };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!validate()) return;
      if (submitBtn) submitBtn.disabled = true;
      try {
        const res = await fetch(CONTACT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: nameEl.value.trim(),
            email: emailEl.value.trim(),
            type: typeEl?.value || '',
            budget: budgetEl?.value || '',
            message: messageEl.value.trim(),
            company: companyEl?.value || ''
          })
        });
        if (res.ok) { form.reset(); showOk("Got it — I'll read this and reply within 1–2 business days."); return; }
      } catch {}

      if (FORMSPREE_ID) {
        try {
          const fd = new FormData(form);
          const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
          if (res.ok) { form.reset(); showOk("Got it — I'll read this and reply within 1–2 business days."); return; }
          showOk('Something went wrong — please email nyaungnicholas@gmail.com directly.');
        } catch {
          showOk('Network error — please email nyaungnicholas@gmail.com directly.');
        }
        return;
      }

      const subject = `Project inquiry — ${typeEl?.value || 'Nicholas'}${nameEl.value.trim() ? ' — ' + nameEl.value.trim() : ''}`;
      const bodyText = `Name: ${nameEl.value.trim()}\nEmail: ${emailEl.value.trim()}\nProject type: ${typeEl?.value || ''}\nBudget / timeline: ${budgetEl?.value || ''}\n\n${messageEl.value.trim()}`;
      window.location.href = `mailto:nyaungnicholas@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
      showOk("Opening your email app… if nothing happens, email nyaungnicholas@gmail.com directly.");
    });
  }
})();