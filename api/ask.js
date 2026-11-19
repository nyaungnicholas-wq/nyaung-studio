import { readFileSync } from 'node:fs';
import path from 'node:path';

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) { hits.set(ip, recent); return true; }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return false;
}

function clientIp(req) {
  const xr = req.headers['x-real-ip'];
  if (typeof xr === 'string' && xr) return xr;
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff) return xff.split(',').pop().trim();
  return 'local';
}

const STOPWORDS = new Set([
  'the','and','for','are','but','not','you','your','with','what','does','did',
  'has','have','how','who','can','this','that','from','into','about','any','all',
  'his','him','its','was','were','will','would','could','should','there','their',
  'they','them','then','than','also','just','like','make','made','build','built',
  'really','much','more','most','some','such','very'
]);

function tokens(s) {
  return [...new Set(s.toLowerCase().match(/[a-z0-9]+/g) || [])]
    .filter(t => t.length >= 3 && !STOPWORDS.has(t))
    .map(t => (t.length > 4 ? t.replace(/s$/, '') : t));   // crude plural fold: agents -> agent
}

const ABOUT = `Nicholas Nyaung is a one-person product and AI studio. He designs, engineers and ships software solo, end to end: design, frontend, backend, infrastructure and the AI layer, with no handoffs. He has built 33 projects across SaaS, AI agents, quant and trading research, websites and content engines; the ones marked Live are running in production. He is 15 and started building about a year ago; his first client was a realtor whose site is still live. He takes on a small number of product, AI-agent and website builds, is open to internships, and replies to serious inquiries within 1-2 business days via the contact form or nyaungnicholas@gmail.com. Prices and timelines are discussed per project and are not published.`;

export function buildDocs(text) {
  const start = text.indexOf('window.NS_PROJECTS = ');
  if (start === -1) return [];
  const jsonStart = start + 'window.NS_PROJECTS = '.length;
  const end = text.indexOf('];', jsonStart);
  if (end === -1) return [];
  const jsonText = text.slice(jsonStart, end + 1);
  const projects = JSON.parse(jsonText);
  const docs = projects.map(p => {
    const parts = [];
    parts.push(`${p.name} — ${p.category}, status: ${p.status}.`);
    if (p.tagline) parts.push(p.tagline);
    if (p.description) parts.push(p.description);
    if (p.problem) parts.push('Problem: ' + p.problem);
    if (p.approach) parts.push('Approach: ' + p.approach);
    if (p.outcome) parts.push('Outcome: ' + p.outcome);
    if (p.highlights) parts.push('Highlights: ' + p.highlights);
    if (p.techStack) parts.push('Stack: ' + p.techStack);
    if (p.url) parts.push('Link: ' + p.url);
    return {
      slug: p.slug,
      name: p.name,
      tagline: p.tagline || '',
      status: p.status || '',
      cat: (p.category || '').toLowerCase(),
      text: parts.join(' ')
    };
  });
  docs.push({ slug: 'about', name: 'About the studio', tagline: 'Who builds it and how', status: '', text: ABOUT });
  return docs;
}

let DOCS_CACHE = null;
function getDocs() {
  if (DOCS_CACHE) return DOCS_CACHE;
  const fileText = readFileSync(path.join(process.cwd(), 'data.js'), 'utf8');
  DOCS_CACHE = buildDocs(fileText);
  return DOCS_CACHE;
}

function retrieve(q) {
  const qTokens = tokens(q);
  const docs = getDocs();
  const scored = docs.map(doc => {
    const nameLower = doc.name.toLowerCase();
    const textLower = doc.text.toLowerCase();
    let score = 0;
    for (const tok of qTokens) {
      if (nameLower.includes(tok)) score += 6;
      if (doc.cat && doc.cat.includes(tok)) score += 6;
      if (doc.tagline.toLowerCase().includes(tok)) score += 3;
      if (doc.status.toLowerCase() === tok) score += 8;   // 'live' -> projects actually live
      const occurrences = (textLower.match(new RegExp(tok, 'g')) || []).length;
      score += Math.min(5, occurrences);
    }
    return { doc, score };
  }).filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(x => x.doc);
  if (scored.length > 0) return scored;
  const live = docs.filter(d => d.status === 'Live').slice(0, 4);
  const aboutDoc = docs.find(d => d.slug === 'about');
  return aboutDoc ? [aboutDoc, ...live] : live;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (rateLimited(clientIp(req))) return res.status(429).json({ error: 'Too many questions — try again in a minute.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const q = String(body?.q ?? '').trim();
  if (q.length < 2 || q.length > 400) return res.status(400).json({ error: 'Ask a question between 2 and 400 characters.' });

  // keyword search over the case studies; no model, no external calls
  let sources = [];
  try { sources = retrieve(q).slice(0, 3).map(d => ({ slug: d.slug, name: d.name, tagline: d.tagline, status: d.status })); } catch {}
  return res.status(200).json({ mode: 'search', answer: null, sources });
}
