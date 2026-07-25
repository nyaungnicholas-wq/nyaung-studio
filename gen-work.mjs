// Regenerates work.html's static project grid and its ItemList JSON-LD from data.js.
// The grid is duplicated as static HTML (for SEO / no-JS) and then re-rendered by app.js;
// this keeps the static copy from drifting out of sync with the data. Run after editing data.js:
//   node gen-work.mjs && node gen-cases.mjs
import fs from 'node:fs';

const window = {};
eval(fs.readFileSync('data.js', 'utf8')); // sets window.NS_PROJECTS
const PROJECTS = window.NS_PROJECTS;

const STATUS = { 'Live': 'live', 'Built': 'built', 'Prototype': 'proto', 'Backtest only': 'proto', 'In progress': 'proto' };
const hue = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };
const grad = (s) => { const h = hue(s), h2 = (h + 48) % 360; return `linear-gradient(135deg, hsl(${h} 60% 20%), hsl(${h2} 55% 11%))`; };
const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CAT = {
  'SaaS Product': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M6.5 6.5h.01"/><path d="M9 6.5h.01"/></svg>',
  'AI Agent': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7z"/><circle cx="18" cy="17.5" r="1.6"/></svg>',
  'Quant / Trading': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 6"/><polyline points="15 6 21 6 21 12"/></svg>',
  'Website': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.7 2.6 2.7 15.4 0 18M12 3c-2.7 2.6-2.7 15.4 0 18"/></svg>',
  'Content Engine': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10.5 9.2v5.6l4.5-2.8z"/></svg>',
  'Developer Tool': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3"/><path d="M13 15h4"/></svg>',
};
const bolt = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>';

const card = (p) => `      <div class="proj">
        <div class="proj-top" style="background:${grad(p.slug)}"><span class="proj-emblem">${CAT[p.category] || CAT['Developer Tool']}</span></div>
        <div class="proj-body">
          <div class="proj-meta"><span class="proj-cat">${esc(p.category)}</span><span class="status ${STATUS[p.status] || 'built'}"><span class="sd"></span>${esc(p.status)}</span></div>
          <h3><button type="button" class="proj-trigger" data-slug="${p.slug}" aria-haspopup="dialog">${esc(p.name)}</button></h3>
          <p class="tagline">${esc(p.tagline)}</p>
          <p class="desc">${esc(p.description)}</p>
          <p class="proj-result">${bolt}<span>${esc(p.result)}</span></p>
          <div class="proj-tags">${(p.techStack || []).slice(0, 4).map((t) => `<span class="proj-tag">${esc(t)}</span>`).join('')}</div>
        </div>
      </div>`;

const ld = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Nicholas — Work',
  itemListElement: PROJECTS.map((p, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: { '@type': 'CreativeWork', name: p.name, description: p.description, ...(p.url ? { url: p.url } : {}) },
  })),
};

let html = fs.readFileSync('work.html', 'utf8');

// --- grid ---
const OPEN = '<div class="proj-grid" id="proj-grid">';
const CLOSE = '\n      </div>\n    </div>\n  </section>';
const a = html.indexOf(OPEN);
if (a < 0) throw new Error('proj-grid open marker not found');
const b = html.indexOf(CLOSE, a);
if (b < 0) throw new Error('proj-grid close marker not found');
html = html.slice(0, a + OPEN.length) + '\n' + PROJECTS.map(card).join('\n') + html.slice(b);

// --- JSON-LD ---
html = html.replace(
  /(<script type="application\/ld\+json" id="ld-itemlist">)[\s\S]*?(<\/script>)/,
  (_m, open, close) => open + JSON.stringify(ld) + close
);

fs.writeFileSync('work.html', html);
console.log(`work.html regenerated — ${PROJECTS.length} projects in grid + JSON-LD`);
