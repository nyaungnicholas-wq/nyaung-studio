// Serverless contact endpoint — sends the form via Resend (server-side, so the
// API key never touches the browser). Works on Vercel out of the box (file at
// /api/contact.js → POST /api/contact). For Netlify, see README for the wrapper.
//
// Required env vars (set in your host's dashboard):
//   RESEND_API_KEY  — from resend.com (kept secret, server-only)
//   CONTACT_TO      — where inquiries land           (default: nyaungnicholas@gmail.com)
//   CONTACT_FROM    — a VERIFIED-domain sender, e.g. "Nicholas <hello@yourdomain.com>"
//                     (default uses Resend's test sender, which only delivers to the account owner)

// In-memory per-IP throttle. Lives per serverless instance, so it's a spam speed
// bump rather than a hard global quota — exactly right for a contact form: it blunts
// casual floods (protecting your inbox and your Resend free-tier quota) with NO extra
// service to set up. The only thing you paste on delivery is your RESEND_API_KEY.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 4;          // 4 messages / minute / IP
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) { hits.set(ip, recent); return true; }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) { for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k); }
  return false;
}

// Trust only platform-set values: Vercel sets x-real-ip to the true client IP and
// appends it as the RIGHTMOST x-forwarded-for hop. Leftmost hops are spoofable.
function clientIp(req) {
  const xr = req.headers['x-real-ip'];
  if (typeof xr === 'string' && xr) return xr;
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff) return xff.split(',').pop().trim();
  return 'local';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  if (rateLimited(clientIp(req))) {
    res.status(429).json({ error: "You're sending messages a little fast — give it a minute, or email me directly." });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    // Honeypot: real visitors never see the "company" field, so any value means a bot.
    // Pretend success so the bot doesn't learn it was caught — but send nothing.
    if (String(body.company || '').trim()) { res.status(200).json({ ok: true }); return; }

    // Strip CR/LF and control chars from single-line fields before they land in the
    // email subject/body (defense-in-depth against header/content injection).
    const clean = (s) => String(s || '').replace(/[\r\n\t\x00-\x1f\x7f]/g, ' ').trim();
    const name = clean(body.name);
    const email = clean(body.email);
    const type = clean(body.type);
    const budget = clean(body.budget);
    const message = String(body.message || '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim();

    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !message) {
      res.status(400).json({ error: 'Please include a name, a valid email, and a message.' });
      return;
    }

    const key = process.env.RESEND_API_KEY;
    if (!key) { res.status(503).json({ error: 'Email is not configured yet.' }); return; }

    const to = process.env.CONTACT_TO || 'nyaungnicholas@gmail.com';
    const from = process.env.CONTACT_FROM || 'Nicholas <onboarding@resend.dev>';
    const subject = `New project inquiry${type ? ' — ' + type : ''} — ${name}`;
    const text =
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      `Project type: ${type || '—'}\n` +
      `Budget / timeline: ${budget || '—'}\n\n` +
      `${message}\n`;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, reply_to: email, subject, text }),
    });

    if (!r.ok) {
      // Log provider detail server-side only — never leak Resend's response (key/domain
      // state, rate-limit info) back to the browser.
      const detail = await r.text().catch(() => '');
      console.error('Resend send failed:', r.status, detail.slice(0, 500));
      res.status(502).json({ error: 'Message could not be sent right now — please email me directly.' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Unexpected error' });
  }
}
