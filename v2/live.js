const el = (tag, className, text) => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
};
const wrap = (tag, className, ...kids) => { const e = el(tag, className); e.append(...kids); return e; };

const navRight = document.querySelector('.nav .nav-right');
if (!navRight) throw new Error('navRight not found');

const navTalk = navRight.querySelector('.nav-talk');

const btnLive = el('button', 'nav-live');
btnLive.type = 'button';
btnLive.setAttribute('aria-expanded', 'false');
btnLive.setAttribute('aria-controls', 'lv-sys');
btnLive.append(el('span', 'lv-dot', ''), el('span', 'lv-label', 'CHECKING'));

const btnAsk = el('button', 'nav-ask');
btnAsk.type = 'button';
btnAsk.setAttribute('aria-expanded', 'false');
btnAsk.setAttribute('aria-controls', 'lv-ask');
btnAsk.textContent = 'ASK';

navRight.insertBefore(btnLive, navTalk);
navRight.insertBefore(btnAsk, navTalk);

const cardSys = el('div', 'lv-card');
cardSys.id = 'lv-sys';
cardSys.hidden = true;
cardSys.setAttribute('role', 'dialog');
cardSys.setAttribute('aria-label', 'Live systems');
cardSys.append(
  wrap('div', 'lv-head', el('span', 'lv-k', 'LIVE SYSTEMS'), el('span', 'lv-time')),
  el('ul', 'lv-rows'),
  wrap('div', 'lv-push', el('span', 'lv-k', 'LAST CODE PUSH'), el('p', 'lv-push-t')),
  el('p', 'lv-foot', 'Checked from the server every 2 minutes. Real requests, real response times.')
);

const cardAsk = el('div', 'lv-card');
cardAsk.id = 'lv-ask';
cardAsk.hidden = true;
cardAsk.setAttribute('role', 'dialog');
cardAsk.setAttribute('aria-label', 'Ask the studio');
const log = el('div', 'lv-log');
log.setAttribute('aria-live', 'polite');
const chips = el('div', 'lv-chips');
['What\'s live right now?', 'Has he built AI agents?', 'How honest are the trading numbers?'].forEach(t => {
  const b = el('button', 'lv-chip', t);
  b.type = 'button';
  chips.append(b);
});
const form = el('form', 'lv-form');
form.noValidate = true;
const input = el('input', 'lv-in');
input.type = 'text';
input.maxLength = 400;
input.autocomplete = 'off';
input.placeholder = 'Ask about his work…';
input.setAttribute('aria-label', 'Your question');
const go = el('button', 'lv-go', 'ASK');
go.type = 'submit';
form.append(input, go);
cardAsk.append(
  wrap('div', 'lv-head', el('span', 'lv-k', 'ASK THE STUDIO'), el('span', 'lv-time', 'SEARCHES THE CASE STUDIES')),
  el('p', 'lv-hint', "Ask about his work and get the matching case studies."),
  log,
  chips,
  form
);

document.body.append(cardSys, cardAsk);

let openCard = null;
const closeAll = () => {
  if (openCard) {
    openCard.hidden = true;
    const btn = openCard === cardSys ? btnLive : btnAsk;
    btn.setAttribute('aria-expanded', 'false');
    openCard = null;
    document.documentElement.classList.remove('lv-open');
  }
};

const open = (card, btn) => {
  closeAll();
  card.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
  openCard = card;
  document.documentElement.classList.add('lv-open');
  if (card === cardAsk) input.focus();
};

// a panel or the menu covers the cards: close them and ignore the buttons while either is open
const covered = () => /panel-open|menu-open/.test(document.documentElement.className);
window.addEventListener('hashchange', closeAll);
btnLive.addEventListener('click', () => covered() ? null : openCard === cardSys ? closeAll() : open(cardSys, btnLive));
btnAsk.addEventListener('click', () => covered() ? null : openCard === cardAsk ? closeAll() : open(cardAsk, btnAsk));

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && openCard) {
    const btn = openCard === cardSys ? btnLive : btnAsk;
    closeAll();
    btn.focus();
  }
});

document.addEventListener('pointerdown', e => {
  if (openCard && !openCard.contains(e.target) && !btnLive.contains(e.target) && !btnAsk.contains(e.target)) closeAll();
});

const ago = iso => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
};

async function loadStatus() {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error();
    const data = await res.json();
    const { checkedAt, systems, lastPush } = data;
    const up = systems.filter(s => s.ok).length;
    const total = systems.length;
    const label = up === 0 || total === 0 ? 'OFFLINE' : `${up}/${total} UP`;
    btnLive.querySelector('.lv-label').textContent = label;
    btnLive.classList.toggle('is-warn', up < total && up > 0);
    btnLive.classList.toggle('is-down', up === 0 || total === 0);
    cardSys.querySelector('.lv-time').textContent = 'CHECKED ' + new Date(checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const rows = cardSys.querySelector('.lv-rows');
    rows.replaceChildren(...systems.map(s => {
      const li = el('li', 'lv-row' + (s.ok ? '' : ' is-down'));
      const a = el('a', 'lv-name', s.name);
      a.href = '#/work/' + s.slug;
      a.addEventListener('click', closeAll);
      li.append(
        a,
        el('span', 'lv-host', new URL(s.url).hostname),
        el('span', 'lv-ms', s.ok ? s.ms + ' ms' : 'DOWN')
      );
      return li;
    }));
    const pushT = cardSys.querySelector('.lv-push-t');
    if (lastPush) {
      pushT.textContent = `${lastPush.repo} · ${ago(lastPush.at)}` + (lastPush.message ? ` — "${lastPush.message}"` : '');
    } else {
      pushT.textContent = 'Push history unavailable right now.';
    }
  } catch {
    btnLive.querySelector('.lv-label').textContent = 'OFFLINE';
    btnLive.classList.add('is-down');
    btnLive.classList.remove('is-warn');
  }
}

loadStatus();
setInterval(() => { if (!document.hidden) loadStatus(); }, 60000);

let pending = false;
const setBusy = b => { pending = b; input.disabled = b; go.disabled = b; };

const renderAnswer = (target, data) => {
  target.classList.remove('is-pending');
  target.replaceChildren();
  if (data.error || !data.mode) {
    target.append(el('p', '', data.error || "Couldn't reach the guide. Try again, or use the contact form."));
    return;
  }
  if (data.mode === 'ai' && data.answer) {
    target.append(el('p', '', data.answer));
  } else if (data.mode === 'search') {
    target.append(el('p', 'lv-note', 'Closest matches in the case studies:'));
  }
  if (data.sources?.length) {
    const src = el('div', 'lv-src');
    data.sources.forEach(s => {
      const a = el('a', 'lv-src-a', s.name);
      a.href = s.slug === 'about' ? '#/about' : '#/work/' + s.slug;
      a.addEventListener('click', closeAll);
      src.append(a);
      if (data.mode === 'search' && s.tagline) src.append(el('span', 'lv-src-t', s.tagline));
    });
    target.append(src);
  }
};

const ask = async q => {
  const qDiv = el('div', 'lv-q', q);
  const aDiv = el('div', 'lv-a is-pending', 'Thinking…');
  log.append(qDiv, aDiv);
  log.scrollTop = log.scrollHeight;
  setBusy(true);
  input.value = '';
  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ q })
    });
    const data = await res.json().catch(() => ({}));
    renderAnswer(aDiv, res.ok ? data : { error: data.error });
  } catch {
    renderAnswer(aDiv, { error: "Couldn't reach the guide. Try again, or use the contact form." });
  }
  setBusy(false);
  input.focus();
  log.scrollTop = log.scrollHeight;
  chips.hidden = true;
};

form.addEventListener('submit', e => {
  e.preventDefault();
  const q = input.value.trim();
  if (q.length >= 2 && !pending) ask(q);
});

chips.addEventListener('click', e => {
  const chip = e.target.closest('.lv-chip');
  if (chip && !pending) {
    input.value = chip.textContent;
    form.dispatchEvent(new Event('submit'));
  }
});