// Merges the workflow-enriched case content (.enriched.json) with the fixed
// project fields and (re)writes data.js. Deterministic — JSON.stringify handles
// all escaping, so the output is always valid JS. Run: node build-data.mjs
import fs from 'node:fs';

const enriched = JSON.parse(fs.readFileSync('.enriched.json', 'utf8')).result.enriched;
const bySlug = Object.fromEntries(enriched.map((e) => [e.slug, e]));

// Display order + the fields that are NOT model-generated (kept verbatim).
const FIXED = {
  grownet: { name: 'GrowNet', category: 'SaaS Product', tagline: 'One funnel that catches leads and starts conversations', result: 'Full inbound → outbound loop verified twice as a client — both passes green', techStack: ['Next.js', 'React 19', 'TypeScript', 'Drizzle ORM', 'Postgres', 'Tailwind'], status: 'Built', url: null, tier: 'flagship' },
  leadnet: { name: 'LeadNet', category: 'SaaS Product', tagline: 'Speed-to-lead capture for local small businesses', result: '14/14 lead-vault tests pass; capture keeps working even if billing lapses', techStack: ['Next.js', 'TypeScript', 'PGlite', 'Drizzle ORM', 'Tailwind', 'Resend'], status: 'Built', url: null, tier: 'standard' },
  reachnet: { name: 'ReachNet', category: 'SaaS Product', tagline: 'Honest-by-design outbound cold email', result: 'Full send → reply → unsubscribe loop verified in the browser', techStack: ['Next.js 16', 'React 19', 'TypeScript', 'Drizzle ORM', 'Postgres', 'Tailwind'], status: 'Built', url: null, tier: 'standard' },
  scoutnet: { name: 'ScoutNet', category: 'AI Agent', tagline: 'Find local businesses, score them, draft the pitch, send', result: 'Discover → score → pitch → send pipeline runs end-to-end, compliance built in', techStack: ['Next.js 16', 'React 19', 'TypeScript', 'Drizzle ORM', 'Resend'], status: 'Built', url: null, tier: 'standard' },
  jarvis: { name: 'Jarvis', category: 'AI Agent', tagline: 'An Iron Man–style assistant that builds holograms', result: 'Self-correction loop renders, critiques, and refines its own 3D builds', techStack: ['Python', 'FastAPI', 'Gemini', 'Three.js', 'Depth Anything V2', 'WebGL'], status: 'Built', url: null, tier: 'flagship' },
  'intern-agent': { name: 'Intern Agent', category: 'AI Agent', tagline: 'An autonomous AI internship hunter', result: '3,200+ lines shipping a full scrape → score → apply → follow-up pipeline', techStack: ['Python', 'Streamlit', 'SQLite', 'Playwright', 'Claude API'], status: 'Built', url: null, tier: 'standard' },
  'mission-control': { name: 'Mission Control', category: 'Developer Tool', tagline: 'A local command center for your whole project fleet', result: 'Running locally — monitors 12 projects; audit agents surfaced 5 real findings', techStack: ['Next.js 15', 'React 19', 'Node.js', 'node:sqlite', 'SSE', 'TypeScript'], status: 'Built', url: null, tier: 'standard' },
  'stock-trader': { name: 'Stock Trader V7', category: 'Quant / Trading', tagline: 'Sector rotation, running live and fully hands-off', result: 'Live & hands-off on Alpaca paper since Jun 2026 — 20.7% CAGR backtest', techStack: ['Python', 'pandas', 'numpy', 'yfinance', 'Alpaca API', 'pytest'], status: 'Live', url: null, tier: 'flagship' },
  'futures-trader': { name: 'NQ Futures Quant Suite', category: 'Quant / Trading', tagline: 'Two-sleeve NQ systems, backtested across 26 years', result: '~21.8% blended CAGR across a 26-year, cost-stressed backtest', techStack: ['Python', 'NumPy', 'Pandas', 'PyArrow'], status: 'Backtest only', url: null, tier: 'standard' },
  'shanty-realestate': { name: 'Shanty Soerjono — Realtor Site', category: 'Website', tagline: 'A live, motion-driven probate-realtor platform', result: 'Live in production at shanty-realestate.com since Jun 2026', techStack: ['Next.js 16', 'React 19', 'Framer Motion', 'Three.js', 'Tailwind', 'Gemini'], status: 'Live', url: 'https://shanty-realestate.com', tier: 'flagship' },
  'troy-njrotc-site': { name: 'Troy NJROTC Warriors', category: 'Website', tagline: 'A cinematic, naval-inspired redesign for a JROTC unit', result: '30+ pages with a custom WebGL hero, built and ready to ship', techStack: ['Three.js', 'GSAP', 'ScrollTrigger', 'Lenis', 'WebGL', 'JavaScript'], status: 'Built', url: null, tier: 'standard' },
  mintset: { name: 'MINTSET', category: 'Content Engine', tagline: 'A weekly autopilot factory for finance reels', result: 'Live & autonomous — 1 TikTok + 5 Instagram parts posted daily, hands-off', techStack: ['Remotion', 'React', 'Node.js', 'ElevenLabs', 'FLUX', 'Buffer API'], status: 'Live', url: null, tier: 'flagship' },
  'finance-book': { name: 'Money, Finally Explained', category: 'Content Engine', tagline: 'Personal finance from zero, for 16–24 year-olds', result: 'Complete — 26 chapters / 99k+ words, EPUB + PDF + HTML builds ready', techStack: ['Python', 'Markdown', 'EPUB3', 'PDF', 'Matplotlib charts'], status: 'Built', url: null, tier: 'standard' },
  'fintwit-dashboard': { name: 'Investor Alpha Hub', category: 'SaaS Product', tagline: 'Track institutional money moves in real time', result: 'Tracks 28+ investors across 7 categories from 9 live data sources', techStack: ['HTML5', 'CSS3', 'Vanilla JS', 'Fira Sans', 'Fira Code'], status: 'Built', url: null, tier: 'standard' },
};

const ORDER = Object.keys(FIXED);

const projects = ORDER.map((slug) => {
  const e = bySlug[slug];
  const f = FIXED[slug];
  if (!e) throw new Error('missing enriched entry for ' + slug);
  return {
    slug,
    name: f.name,
    category: f.category,
    tagline: f.tagline,
    description: e.description,
    problem: e.problem,
    approach: (e.approach || '').replace(/RSt\(2\)/g, 'RSI(2)'), // fix model typo
    outcome: e.outcome,
    highlights: e.highlights,
    metrics: Array.isArray(e.metrics) ? e.metrics : [],
    result: f.result,
    techStack: f.techStack,
    status: f.status,
    url: f.url,
    tier: f.tier,
  };
});

const header = `/* ============================================================
   NICHOLAS — portfolio data
   Curated to the studio's OWN builds. External clones
   (graphify, ArcReel) deliberately excluded. Jarvis is
   represented as the custom Iron Man assistant only.
   Each project carries a truthful result + a full case write-up
   (problem / approach / outcome / highlights / metrics).
   Generated by build-data.mjs — edit .enriched.json or FIXED there.
   ============================================================ */
`;

const testimonials = `

/* ============================================================
   TESTIMONIALS — fill these in with REAL client quotes to make
   the "What clients say" section appear (hidden while empty).
   Example shape:
   { quote: "Nicholas shipped our MVP in 5 weeks, solo.", name: "Shanty Soerjono",
     title: "Probate & Trust Realtor", url: "https://shanty-realestate.com" }
   ============================================================ */
window.NS_TESTIMONIALS = [
  // { quote: "", name: "", title: "", url: "" },
];
`;

const out = header + 'window.NS_PROJECTS = ' + JSON.stringify(projects, null, 2) + ';\n' + testimonials;
fs.writeFileSync('data.js', out);
console.log('wrote data.js —', projects.length, 'projects, fields:', Object.keys(projects[0]).join(', '));
