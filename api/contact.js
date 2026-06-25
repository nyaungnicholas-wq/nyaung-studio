// Serverless contact endpoint — sends the form via Resend (server-side, so the
// API key never touches the browser). Works on Vercel out of the box (file at
// /api/contact.js → POST /api/contact). For Netlify, see README for the wrapper.
//
// Required env vars (set in your host's dashboard):
//   RESEND_API_KEY  — from resend.com (kept secret, server-only)
//   CONTACT_TO      — where inquiries land           (default: nyaungnicholas@gmail.com)
//   CONTACT_FROM    — a VERIFIED-domain sender, e.g. "Nicholas <hello@yourdomain.com>"
//                     (default uses Resend's test sender, which only delivers to the account owner)

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const message = String(body.message || '').trim();
    const type = String(body.type || '').trim();
    const budget = String(body.budget || '').trim();

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
      const detail = await r.text().catch(() => '');
      res.status(502).json({ error: 'Send failed', detail: detail.slice(0, 200) });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Unexpected error' });
  }
}
