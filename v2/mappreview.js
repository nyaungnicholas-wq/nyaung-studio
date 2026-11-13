export default function createMapPreview(stage, opts = {}) {
  const NAMES = ['WORK', 'ABOUT', 'SERVICES', 'WRITING', 'NOW'];
  const KEYS = ['work', 'about', 'services', 'writing', 'now'];
  const cache = new Array(5).fill(null);
  let current = -1;
  let timer = 0;

  // Build DOM once
  const el = document.createElement('aside');
  el.className = 'mp';
  el.setAttribute('aria-live', 'polite');
  el.inert = true;
  el.innerHTML = `
    <p class="mp-k"><span class="mp-n">01</span><span class="mp-name">WORK</span></p>
    <h3 class="mp-t"></h3>
    <p class="mp-l"></p>
    <ul class="mp-list"></ul>
    <div class="mp-actions">
      <button type="button" class="mp-next"><span class="mp-next-l">Next stop</span><span class="mp-next-to"></span></button>
      <a class="mp-cta more" href="#"></a>
    </div>
    <button type="button" class="mp-skip">Skip the map</button>
    <span class="mp-bar" aria-hidden="true"><i></i></span>
  `;
  stage.appendChild(el);

  const numEl = el.querySelector('.mp-n');
  const nameEl = el.querySelector('.mp-name');
  const titleEl = el.querySelector('.mp-t');
  const ledeEl = el.querySelector('.mp-l');
  const listEl = el.querySelector('.mp-list');
  const ctaEl = el.querySelector('.mp-cta');
  const nextTo = el.querySelector('.mp-next-to');
  const NEXT = ['About', 'Services', 'Writing', 'Now', 'Contact'];
  // the map holds at each stop: these are the ways forward (callbacks supplied by main.js)
  el.querySelector('.mp-next').addEventListener('click', () => { if (opts.onNext) opts.onNext(); });
  el.querySelector('.mp-skip').addEventListener('click', () => { if (opts.onSkip) opts.onSkip(); });

  function collapse(s) {
    return (s || '').replace(/\s+/g, ' ').trim();
  }

  function getProjects() {
    return Array.isArray(window.NS_PROJECTS) ? window.NS_PROJECTS : [];
  }

  function buildContent(k) {
    if (cache[k]) return cache[k];
    const n = String(k + 1).padStart(2, '0');
    let title, lede, items, href, cta;

    if (k === 0) {
      const P = getProjects();
      const sel = P.filter(p => p.selected)
        .sort((a, b) => Number(a.selected) - Number(b.selected));
      title = 'Selected work';
      lede = "Four I'd show you first.";
      items = sel.slice(0, 4).map(p => collapse(p.name + (p.tagline ? ' — ' + p.tagline : '')));
      href = '#/archive';
      cta = P.length ? 'Open all ' + P.length + ' projects' : 'Open the archive';
    } else {
      const frag = document.getElementById('tpl-' + KEYS[k])?.content;
      if (frag) {
        title = collapse(frag.querySelector('.pn-title')?.textContent);
        lede = collapse(frag.querySelector('.pn-lede')?.textContent);
        const sources = [
          [...frag.querySelectorAll('.pn-post-t')].map(e => collapse(e.textContent)),
          [...frag.querySelectorAll('.pn-cell .pn-h')].map(e => collapse(e.textContent)),
          [...frag.querySelectorAll('.pn-sec > .pn-h')].map(e => collapse(e.textContent))
        ];
        items = [];
        for (const src of sources) {
          const filtered = src.filter(Boolean);
          if (filtered.length) {
            items = [...new Set(filtered)].slice(0, 3);
            break;
          }
        }
      } else {
        title = NAMES[k];
        lede = '';
        items = [];
      }
      href = '#/' + KEYS[k];
      cta = 'Open ' + KEYS[k];
    }

    cache[k] = { key: KEYS[k], n, name: NAMES[k], title, lede, items, href, cta };
    return cache[k];
  }

  function applyContent(data) {
    numEl.textContent = data.n;
    nameEl.textContent = data.name;
    titleEl.textContent = data.title;
    ledeEl.textContent = data.lede;
    listEl.textContent = '';
    data.items.forEach(t => {
      const li = document.createElement('li');
      li.textContent = t;
      listEl.appendChild(li);
    });
    ctaEl.href = data.href;
    ctaEl.textContent = '> ' + data.cta;
    nextTo.textContent = NEXT[KEYS.indexOf(data.key)] + ' →';
  }

  function show(k) {
    if (k < 0 || k > 4) return hide();
    if (k === current) return;          // called every frame while parked: only the first call starts the pull-up
    clearTimeout(timer);
    current = k;
    const data = buildContent(k);
    applyContent(data);
    el.classList.remove('is-on');
    void el.offsetWidth; // force reflow
    const delay = opts.reducedMotion ? 0 : 260;
    timer = setTimeout(() => {
      el.classList.add('is-on');
      stage.classList.add('has-preview');
      el.inert = false;
      timer = 0;
    }, delay);
  }

  function hide() {
    if (current === -1 && !timer) return;
    clearTimeout(timer);
    timer = 0;
    if (el.classList.contains('is-on')) {
      el.classList.remove('is-on');
      stage.classList.remove('has-preview');
      el.inert = true;
    }
    current = -1;
  }

  return { show, hide };
}