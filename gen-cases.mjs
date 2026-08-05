// Generates a per-project case-study page (work-<slug>.html) for every project in data.js.
import fs from 'node:fs';

const window = {};
eval(fs.readFileSync('data.js', 'utf8')); // sets window.NS_PROJECTS
const PROJECTS = window.NS_PROJECTS;

const STATUS = { 'Live': 'live', 'Built': 'built', 'Prototype': 'proto', 'Backtest only': 'proto', 'In progress': 'proto' };
const hue = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };
const grad = (s) => { const h = hue(s), h2 = (h + 48) % 360; return `linear-gradient(135deg, hsl(${h} 60% 20%), hsl(${h2} 55% 11%))`; };
const liveUrl = (u) => u.startsWith('http') ? u : 'https://' + u;
const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const COVER_CLASS = { 'SaaS Product': 'cat-saas', 'AI Agent': 'cat-ai', 'Quant / Trading': 'cat-quant', 'Website': 'cat-web', 'Content Engine': 'cat-content', 'Developer Tool': 'cat-tool' };
const coverClass = (p) => COVER_CLASS[p.category] || 'cat-tool';
const CAT = {
  'SaaS Product': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M6.5 6.5h.01"/><path d="M9 6.5h.01"/></svg>',
  'AI Agent': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7z"/><circle cx="18" cy="17.5" r="1.6"/></svg>',
  'Quant / Trading': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 6"/><polyline points="15 6 21 6 21 12"/></svg>',
  'Website': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.7 2.6 2.7 15.4 0 18M12 3c-2.7 2.6-2.7 15.4 0 18"/></svg>',
  'Content Engine': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10.5 9.2v5.6l4.5-2.8z"/></svg>',
  'Developer Tool': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3"/><path d="M13 15h4"/></svg>',
};
const check = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
const leftArrow = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>';
const extIcon = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>';

const SCRIPTS = `
  <script defer src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <script defer src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
  <script defer src="https://unpkg.com/lenis@1.1.14/dist/lenis.min.js"></script>
  <script src="data.js?v=5"></script>
  <script src="components.js?v=4"></script>
  <script src="app.js?v=4"></script>
  <script type="importmap">{ "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js", "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/" } }</script>
  <script type="module" src="scene.js?v=7"></script>
  <script defer src="motion.js?v=6"></script>
  <script defer src="premium.js?v=4"></script>
  <script defer src="assistant.js?v=4"></script>
  <script defer src="interactive.js?v=4"></script>`;

const head = (p) => {
  const desc = esc(p.tagline + ' — ' + p.description.slice(0, 120));
  const ld = {
    '@context': 'https://schema.org', '@type': 'CreativeWork', name: p.name, headline: p.name + ' — ' + p.tagline,
    description: p.description, ...(p.url ? { url: liveUrl(p.url) } : {}),
    creator: { '@type': 'Person', name: 'Nicholas Nyaung', url: 'https://nicholasnyaung.com/about.html' },
    keywords: (p.techStack || []).join(', '), about: p.category,
  };
  return `<!DOCTYPE html>
<html lang="en" data-page="work">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(p.name)} — Case Study | Nicholas</title>
  <meta name="description" content="${desc}" />
  <meta name="theme-color" content="#07070B" />
  <script>document.documentElement.classList.add('js');</script>
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://nicholasnyaung.com/work-${p.slug}.html" />
  <meta property="og:title" content="${esc(p.name)} — ${esc(p.tagline)}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="https://nicholasnyaung.com/assets/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="https://nicholasnyaung.com/assets/og.png" />
  <link rel="preconnect" href="https://api.fontshare.com" crossorigin />
  <link rel="preload" as="style" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&f[]=general-sans@400,500,600&display=swap" />
  <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&f[]=general-sans@400,500,600&display=swap" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap" />
  <link rel="icon" type="image/svg+xml" href="assets/favicon.svg" />
  <link rel="stylesheet" href="styles.css?v=4" />
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>`;
};

const body = (p, prev, next) => {
  const st = STATUS[p.status] || 'built';
  const tags = (p.techStack || []).map((t) => `<span class="proj-tag">${esc(t)}</span>`).join('');
  const live = (p.url) ? `<a class="btn btn-ghost" href="${liveUrl(p.url)}" target="_blank" rel="noopener" style="padding:8px 16px">Visit live ${extIcon}</a>` : '';
  const caseBlock = (p.problem || p.outcome) ? `
      <div class="feature-grid reveal" style="grid-template-columns:1fr 1fr;margin-bottom:8px">
        ${p.problem ? `<div class="feature"><h3>The problem</h3><p>${esc(p.problem)}</p></div>` : ''}
        ${p.outcome ? `<div class="feature"><h3>What I built</h3><p>${esc(p.outcome)}</p></div>` : ''}
      </div>` : '';
  const highlights = (p.highlights || []).map((h) => `<li>${check}<span>${esc(h)}</span></li>`).join('');
  const metrics = (p.metrics || []);
  const metricsHTML = metrics.length
    ? `<div class="metric-strip reveal" style="margin:4px 0 26px">${metrics.map((m) => `<div class="metric"><span class="mv">${esc(m.value)}</span><span class="ml">${esc(m.label)}</span></div>`).join('')}</div>`
    : '';
  const approachHTML = p.approach
    ? `<h2 class="reveal" style="font-size:clamp(24px,3vw,32px);letter-spacing:-0.02em;margin:14px 0 14px">How it works</h2>
        <div class="prose reveal" style="margin:0 0 30px"><p>${esc(p.approach)}</p></div>`
    : '';
  return `<body>
  <canvas id="hero-canvas" aria-hidden="true"></canvas>
  <main id="top">
    <section class="page-hero">
      <div class="wrap case-wrap">
        <a href="work.html" class="case-back">${leftArrow} All work</a>
        <span class="eyebrow reveal">${esc(p.category)}</span>
        <h1 class="reveal" data-d="1">${esc(p.name)}</h1>
        <p class="lede reveal" data-d="2">${esc(p.tagline)}</p>
        <div class="case-meta reveal" data-d="3">
          <span class="status ${st}"><span class="sd"></span>${p.status}</span>
          ${live}
        </div>
      </div>
    </section>

    <section style="padding-top:8px">
      <div class="wrap case-wrap">
        <div class="case-cover cover ${coverClass(p)} reveal"><span class="proj-emblem">${CAT[p.category] || CAT['Developer Tool']}</span></div>
        <div class="prose reveal" style="margin:30px 0 22px"><p>${esc(p.description)}</p></div>
        ${metricsHTML}
        ${caseBlock}
        ${approachHTML}
        ${p.result ? `<div class="m-result reveal" style="margin:6px 0 30px">${'<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>'}<span>${esc(p.result)}</span></div>` : ''}
        <h2 class="reveal" style="font-size:clamp(24px,3vw,32px);letter-spacing:-0.02em;margin:8px 0 16px">Highlights</h2>
        <ul class="case-list reveal">${highlights}</ul>
        <div class="case-meta reveal" style="margin-top:30px">${tags}</div>
      </div>
    </section>

    <section style="padding-top:10px">
      <div class="wrap case-wrap">
        <div class="case-nav">
          <a href="work-${prev.slug}.html"><div class="dir">← Previous</div><div class="nm">${esc(prev.name)}</div></a>
          <a class="next" href="work-${next.slug}.html"><div class="dir">Next →</div><div class="nm">${esc(next.name)}</div></a>
        </div>
      </div>
    </section>

    <section class="cta-band">
      <div class="wrap">
        <div class="cta-card reveal">
          <span class="eyebrow" style="justify-content:center">Want one of these?</span>
          <h2>Let's build <span class="brand-text">yours.</span></h2>
          <p>Tell me what you're trying to ship — you'll get a scoped plan and a straight answer.</p>
          <div class="cta-actions">
            <a href="contact.html" class="btn btn-primary btn-lg">Start a project</a>
            <a href="work.html" class="btn btn-ghost btn-lg">See all work</a>
          </div>
        </div>
      </div>
    </section>
  </main>
${SCRIPTS}
</body>
</html>`;
};

// `custom: true` marks a project whose case-study page is hand-built (its own
// scroll narrative and WebGL), so this generator must not overwrite it. It still
// carries a full data.js entry, so it appears in the work grid and in its
// neighbours' prev/next links exactly like a generated page.
let written = 0, skipped = [];
PROJECTS.forEach((p, i) => {
  if (p.custom) { skipped.push(p.slug); return; }
  const prev = PROJECTS[(i - 1 + PROJECTS.length) % PROJECTS.length];
  const next = PROJECTS[(i + 1) % PROJECTS.length];
  fs.writeFileSync(`work-${p.slug}.html`, head(p) + '\n' + body(p, prev, next));
  written++;
});
console.log('generated', written, 'case-study pages' + (skipped.length ? ` — skipped hand-built: ${skipped.join(', ')}` : ''));
