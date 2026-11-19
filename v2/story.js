// Story overlay for 5-scene scroll-driven homepage
const BEATS = [
  ['Intro', ''],
  ['Selected work', 'Four projects, from first client to full product.'],
  ['About', '33 projects delivered, designed and engineered end to end.'],
  ['Clients', 'Client work, AI systems and products.'],
  ['Contact', 'Accepting client projects and internship opportunities.'],
];
const pad = i => String(i + 1).padStart(2, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function initStory() {
  const el = document.createElement('div');
  el.id = 'story';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="st-rail"><span class="st-n"></span><span class="st-ticks">${BEATS.map(() => '<i></i>').join('')}</span><span class="st-t"></span></div><div class="st-cap"><p class="st-k"></p><p class="st-h"></p><p class="st-l"></p></div>`;
  document.body.appendChild(el);
  const nEl = el.querySelector('.st-n'), tEl = el.querySelector('.st-t'), capEl = el.querySelector('.st-cap');
  const kEl = el.querySelector('.st-k'), hEl = el.querySelector('.st-h'), lEl = el.querySelector('.st-l');
  const ticks = el.querySelectorAll('.st-ticks i');
  let cur = -1, capFor = -1;
  return (active, next, tp) => {
    const c = (tp > 0.5 && next >= 0) ? next : active;
    if (c !== cur) { cur = c; nEl.textContent = `${pad(c)} / 05`; tEl.textContent = BEATS[c][0]; ticks.forEach((t, i) => t.classList.toggle('on', i <= c)); }
    const show = (next >= 0 && tp > 0) ? clamp((0.5 - Math.abs(tp - 0.5)) * 4, 0, 1) : 0;
    if (next >= 0 && next !== capFor && show > 0) { capFor = next; kEl.textContent = `Chapter ${pad(next)}`; hEl.textContent = BEATS[next][0]; lEl.textContent = BEATS[next][1]; }
    capEl.style.opacity = show.toFixed(3);
    document.documentElement.style.setProperty('--cap', show.toFixed(3));   // sections fade their own text under the caption
    capEl.style.transform = `translate(-50%, calc(-50% + ${((0.5 - tp) * 40).toFixed(1)}px))`;
  };
}