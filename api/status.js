// GET /api/status: are the live products up, and when did code last ship? Cached at the edge for 2 min.
import fs from 'node:fs';
import path from 'node:path';

const UA = { 'user-agent': 'nicholasnyaung.com status check' };
let projects = null;

export function parseProjects(text) {
  const marker = 'window.NS_PROJECTS = ';
  const rest = text.slice(text.indexOf(marker) + marker.length);
  return JSON.parse(rest.slice(0, rest.indexOf('];') + 1));
}

function targets() {
  try {
    if (!projects) projects = parseProjects(fs.readFileSync(path.join(process.cwd(), 'data.js'), 'utf8'));
  } catch { return []; }
  return projects
    .filter(p => p.status === 'Live' && typeof p.url === 'string' && p.url.startsWith('https://') && !/github\.(com|io)/.test(p.url))
    .map(({ slug, name, url }) => ({ slug, name, url }));
}

async function probe(t) {
  const t0 = performance.now();
  try {
    const r = await fetch(t.url, { redirect: 'follow', signal: AbortSignal.timeout(6000), headers: UA });
    const ms = Math.round(performance.now() - t0);
    try { await r.body?.cancel(); } catch {}
    return { ...t, ok: r.status < 400, ms };
  } catch { return { ...t, ok: false, ms: null }; }
}

async function lastPush() {
  try {
    const r = await fetch('https://api.github.com/users/nyaungnicholas-wq/events/public?per_page=30', {
      signal: AbortSignal.timeout(6000), headers: { accept: 'application/vnd.github+json', ...UA }
    });
    if (!r.ok) return null;
    const ev = (await r.json()).find(e => e.type === 'PushEvent');
    if (!ev) return null;
    const msg = ev.payload?.commits?.[0]?.message;
    return { repo: ev.repo.name.replace(/^nyaungnicholas-wq\//, ''), at: ev.created_at, message: msg ? msg.split('\n')[0].slice(0, 90) : null };
  } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.status(405).json({ error: 'Method not allowed' }); return; }
  // the edge cache keys on the query string, so refuse one: no cache-busting fan-out to the products or GitHub
  if ((req.url || '').includes('?')) { res.status(400).json({ error: 'No query string' }); return; }
  const [systems, push] = await Promise.all([Promise.all(targets().map(probe)), lastPush()]);
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
  res.status(200).json({ checkedAt: new Date().toISOString(), systems, lastPush: push });
}
