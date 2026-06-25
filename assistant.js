/* ============================================================
   NICHOLAS — Studio Assistant
   A lightweight, on-page assistant that answers common questions
   from a local knowledge base (no backend / no API key).
   ============================================================ */
(function () {
  const EMAIL = 'nyaungnicholas@gmail.com';
  const KB = [
    { k: ['service', 'do you do', 'what do you', 'offer', 'build for', 'help with', 'capab'], a: `I design, build, and ship software end to end — <strong>SaaS products, AI agents, trading systems, websites, and content engines</strong>. Full menu on the <a href="services.html">Services</a> page.` },
    { k: ['available', 'hire', 'taking', 'open', 'work with', 'free'], a: `Yes — open for projects. Start one on the <a href="contact.html">Contact</a> page or email <a href="mailto:${EMAIL}">${EMAIL}</a>. I reply within 1–2 business days.` },
    { k: ['price', 'cost', 'how much', 'budget', 'rate', 'pricing', 'expensive'], a: `Project work is <strong>fixed-price against an agreed outcome</strong> — you know the number before we start. Retainers are monthly; advisory is by engagement. More in the FAQ on <a href="services.html">Services</a>.` },
    { k: ['start', 'get going', 'begin', 'first step', 'process', 'how do we'], a: `Email a few sentences on what you're building. We do a short framing call, then you get a clear plan, timeline, and price <em>before</em> any commitment. <a href="contact.html">Start here →</a>` },
    { k: ['work', 'project', 'portfolio', 'built', 'case stud', 'examples', 'shipped'], a: `14 products shipped, 3 live in production. Each has a full write-up on the <a href="work.html">Work</a> page.` },
    { k: ['tech', 'stack', 'language', 'framework', 'tools'], a: `Next.js, React, TypeScript, Python, FastAPI, Three.js, GSAP, Remotion, Postgres — and Gemini / Claude / FLUX for the AI layer.` },
    { k: ['who', 'about', 'natalie', 'you', 'team', 'solo'], a: `Nicholas is a one-person product & AI studio run by Nicholas Nyaung — one builder, end to end. More on the <a href="about.html">About</a> page.` },
    { k: ['ai', 'agent', 'automat', 'llm', 'chatbot'], a: `AI agents are a core discipline — e.g. <a href="work-scoutnet.html">ScoutNet</a> (a lead scout that pitches) and <a href="work-jarvis.html">Jarvis</a> (a vision assistant). I embed agents that perceive, decide, and act.` },
    { k: ['trad', 'quant', 'stock', 'invest', 'finance'], a: `<a href="work-stock-trader.html">Stock Trader V7</a> runs live on an Alpaca paper account (20.7% CAGR in backtest), plus a 26-year-backtested NQ futures suite.` },
    { k: ['contact', 'email', 'reach', 'talk', 'call'], a: `Email <a href="mailto:${EMAIL}">${EMAIL}</a> or use the <a href="contact.html">Contact</a> form. Replies in 1–2 business days.` },
  ];
  const GREETING = `Hi — I'm the studio assistant. Ask me about services, pricing, the work, or how to start. 👋`;
  const CHIPS = ['What do you do?', 'Are you available?', 'How much?', 'How do we start?'];

  function answer(text) {
    const q = text.toLowerCase();
    let best = null, score = 0;
    for (const item of KB) {
      const s = item.k.reduce((n, kw) => n + (q.includes(kw) ? 1 : 0), 0);
      if (s > score) { score = s; best = item; }
    }
    return score ? best.a : `I can help with services, pricing, availability, the work, or how to start. For anything specific, email <a href="mailto:${EMAIL}">${EMAIL}</a> — I read every message.`;
  }

  function init() {
    const btn = document.createElement('button');
    btn.className = 'assistant-btn'; btn.setAttribute('aria-label', 'Open the studio assistant');
    btn.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.6 4L18 8.6 14 10.2 12 14l-2-3.8L6 8.6 10.4 7z"/><circle cx="18" cy="17" r="1.4"/></svg>`;
    const panel = document.createElement('div');
    panel.className = 'assistant-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Studio assistant'); panel.hidden = true;
    panel.innerHTML = `
      <div class="ap-head">
        <span class="ap-dot"></span><strong>Studio Assistant</strong>
        <button class="ap-close" aria-label="Close assistant">&times;</button>
      </div>
      <div class="ap-log" id="ap-log"></div>
      <div class="ap-chips" id="ap-chips"></div>
      <form class="ap-form" id="ap-form">
        <input id="ap-input" type="text" autocomplete="off" placeholder="Ask a question…" aria-label="Ask the assistant" />
        <button type="submit" aria-label="Send">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>`;
    document.body.appendChild(btn); document.body.appendChild(panel);

    const log = panel.querySelector('#ap-log');
    const chipsWrap = panel.querySelector('#ap-chips');
    const add = (html, who) => { const d = document.createElement('div'); d.className = 'amsg ' + who; d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; };
    const ask = (text) => { add(text.replace(/</g, '&lt;'), 'user'); setTimeout(() => add(answer(text), 'bot'), 220); };

    let seeded = false;
    const open = () => {
      panel.hidden = false; btn.classList.add('open');
      if (!seeded) { add(GREETING, 'bot'); seeded = true; }
      setTimeout(() => panel.querySelector('#ap-input').focus(), 60);
    };
    const close = () => { panel.hidden = true; btn.classList.remove('open'); btn.focus(); };
    btn.addEventListener('click', () => panel.hidden ? open() : close());
    panel.querySelector('.ap-close').addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(); });

    CHIPS.forEach(c => { const b = document.createElement('button'); b.className = 'ap-chip'; b.textContent = c; b.addEventListener('click', () => ask(c)); chipsWrap.appendChild(b); });
    panel.querySelector('#ap-form').addEventListener('submit', (e) => {
      e.preventDefault(); const inp = panel.querySelector('#ap-input'); const v = inp.value.trim(); if (!v) return; inp.value = ''; ask(v);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
