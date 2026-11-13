import fs from 'node:fs';

const window = {};
eval(fs.readFileSync('data.js', 'utf8'));
const PROJECTS = window.NS_PROJECTS;

const STATUS = { 'Live': 'live', 'Built': 'built', 'Prototype': 'proto', 'Backtest only': 'proto', 'In progress': 'proto' };
const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CAT = {
  'Quant & Research': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 6"/><polyline points="15 6 21 6 21 12"/></svg>',
  'Products': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M6.5 6.5h.01"/><path d="M9 6.5h.01"/></svg>',
  'AI Agents': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7z"/><circle cx="18" cy="17.5" r="1.6"/></svg>',
  'Motion & Content': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10.5 9.2v5.6l4.5-2.8z"/></svg>',
  'Tools & Websites': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3"/><path d="M13 15h4"/></svg>',
};

const COVER = {
  'Quant & Research': 'cat-quant',
  'Products': 'cat-saas',
  'AI Agents': 'cat-ai',
  'Motion & Content': 'cat-content',
  'Tools & Websites': 'cat-tool',
};

const CAT_MAP = {
  'Quant / Trading': 'Quant & Research',
  'SaaS Product': 'Products',
  'AI Agent': 'AI Agents',
  'Content Engine': 'Motion & Content',
  'Developer Tool': 'Tools & Websites',
  'Website': 'Tools & Websites',
};

const DISPLAY_ORDER = [
  'Quant & Research',
  'Products',
  'AI Agents',
  'Motion & Content',
  'Tools & Websites',
];

const bolt = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>';

const card = (p) => {
  const cat = CAT_MAP[p.category] || p.category;
  return `      <div class="proj">
        <div class="proj-top cover ${COVER[cat] || 'cat-tool'}"><span class="proj-emblem">${CAT[cat] || CAT['Tools & Websites']}</span></div>
        <div class="proj-body">
          <div class="proj-meta"><span class="proj-cat">${esc(cat)}</span><span class="status ${STATUS[p.status] || 'built'}"><span class="sd"></span>${esc(p.status)}</span></div>
          <h3><button type="button" class="proj-trigger" data-slug="${p.slug}" aria-haspopup="dialog">${esc(p.name)}</button></h3>
          <p class="tagline">${esc(p.tagline)}</p>
          <p class="desc">${esc(p.description)}</p>
          <p class="proj-result">${bolt}<span>${esc(p.result)}</span></p>
          <div class="proj-tags">${(p.techStack || []).slice(0, 4).map((t) => `<span class="proj-tag">${esc(t)}</span>`).join('')}</div>
        </div>
      </div>`;
};

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

const SELECTED = PROJECTS.filter(p => p.selected).sort((a, b) => a.selected - b.selected);
const ARCHIVE = PROJECTS.filter(p => !p.selected);

let html = fs.readFileSync('work.html', 'utf8');

const byCat = {};
for (const p of ARCHIVE) {
  const cat = CAT_MAP[p.category] || p.category;
  if (!byCat[cat]) byCat[cat] = [];
  byCat[cat].push(p);
}

for (const cat of Object.keys(byCat)) {
  if (!DISPLAY_ORDER.includes(cat)) {
    throw new Error(`Unknown category in data.js: ${cat}`);
  }
}

const bands = DISPLAY_ORDER
  .filter(cat => byCat[cat] && byCat[cat].length > 0)
  .map(cat => {
    const projects = byCat[cat];
    const count = projects.length;
    const cardsHtml = projects.map(card).join('\n');
    return `    <section class="work-band" data-cat="${esc(cat)}">
      <header class="work-band-head">
        <h2>${esc(cat)}</h2>
        <span class="work-band-count">${count}</span>
      </header>
      <div class="proj-grid">
${cardsHtml}
      </div>
    </section>`;
  })
  .join('\n');

const selectedSection = `    <section class="work-selected" aria-labelledby="sel-h">
      <header class="work-band-head">
        <h2 id="sel-h">Selected work</h2>
        <span class="work-band-count">${SELECTED.length}</span>
      </header>
      <div class="proj-grid selected-grid">
${SELECTED.map(card).join('\n')}
      </div>
    </section>`;

const archiveBands = `    <details class="work-archive">
      <summary class="work-archive-summary">Archive: ${ARCHIVE.length} more builds, experiments and studies</summary>
      <div class="filters" id="filters" role="group" aria-label="Filter projects by category"></div>
${bands}
    </details>`;

const bandsContent = `${selectedSection}\n${archiveBands}`;

const bandsHtml = `<div id="work-bands">
${bandsContent}
</div><!-- /work-bands -->`;

const NEW_OPEN = '<div id="work-bands">';
const NEW_CLOSE = '</div><!-- /work-bands -->';
const OLD_OPEN = '<div class="proj-grid" id="proj-grid">';
const OLD_CLOSE = '\n      </div>\n    </div>\n  </section>';

let newHtml;
const newOpenIdx = html.indexOf(NEW_OPEN);
if (newOpenIdx >= 0) {
  const newCloseIdx = html.indexOf(NEW_CLOSE, newOpenIdx);
  if (newCloseIdx < 0) throw new Error('work-bands close marker not found');
  newHtml = html.slice(0, newOpenIdx + NEW_OPEN.length) + '\n' + bandsContent + html.slice(newCloseIdx);
} else {
  const oldOpenIdx = html.indexOf(OLD_OPEN);
  if (oldOpenIdx < 0) throw new Error('Neither work-bands nor proj-grid marker found in work.html');
  const oldCloseIdx = html.indexOf(OLD_CLOSE, oldOpenIdx);
  if (oldCloseIdx < 0) throw new Error('proj-grid close marker not found');
  newHtml = html.slice(0, oldOpenIdx) + bandsHtml + html.slice(oldCloseIdx + OLD_CLOSE.length);
}

newHtml = newHtml.replace(
  /(<script type="application\/ld\+json" id="ld-itemlist">)[\s\S]*?(<\/script>)/,
  (_m, open, close) => open + JSON.stringify(ld) + close
);

fs.writeFileSync('work.html', newHtml);

const bandCounts = DISPLAY_ORDER
  .filter(cat => byCat[cat] && byCat[cat].length > 0)
  .map(cat => `${cat}: ${byCat[cat].length}`)
  .join(', ');
console.log(`work.html regenerated — ${PROJECTS.length} projects: ${SELECTED.length} selected, archive (${bandCounts})`);