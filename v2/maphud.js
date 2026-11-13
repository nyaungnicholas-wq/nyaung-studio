export default function createMapHud(stage, opts = {}) {
  const reduced = !!opts.reducedMotion;
  const section = stage.closest('section');
  const nodes = document.querySelectorAll('#clients .mm-node');
  const labels = Array.from(nodes).map(n => n.querySelector('.mm-tag'));
  const originalTexts = new WeakMap();
  labels.forEach(l => {
    const tn = Array.from(l.childNodes).reverse().find(n => n.nodeType === 3);
    if (tn) originalTexts.set(l, tn.textContent || '');
  });

  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.setAttribute('aria-hidden', 'true');
  hud.innerHTML = `
    <span class="hud-k">ALT</span><span class="hud-v" data-alt>000</span><span class="hud-u">M</span>
    <span class="hud-sep"></span>
    <span class="hud-k">HDG</span><span class="hud-v" data-hdg>000</span><span class="hud-u">°</span>
    <span class="hud-sep"></span>
    <span class="hud-k">STOP</span><span class="hud-v" data-stop>--</span><span class="hud-u">/06</span>
  `;

  const route = document.createElement('nav');
  route.className = 'route';
  route.setAttribute('aria-label', 'Map stops');
  route.innerHTML = `
    <span class="route-track"><span class="route-fill"></span></span>
    <ol>
      <li><button type="button" class="route-stop" data-k="0"><span class="route-n">01</span><span class="route-l">WORK</span></button></li>
      <li><button type="button" class="route-stop" data-k="1"><span class="route-n">02</span><span class="route-l">ABOUT</span></button></li>
      <li><button type="button" class="route-stop" data-k="2"><span class="route-n">03</span><span class="route-l">SERVICES</span></button></li>
      <li><button type="button" class="route-stop" data-k="3"><span class="route-n">04</span><span class="route-l">WRITING</span></button></li>
      <li><button type="button" class="route-stop" data-k="4"><span class="route-n">05</span><span class="route-l">NOW</span></button></li>
      <li><button type="button" class="route-stop" data-k="5"><span class="route-n">06</span><span class="route-l">CONTACT</span></button></li>
    </ol>
  `;

  stage.append(hud, route);

  const fill = route.querySelector('.route-fill');
  const stops = route.querySelectorAll('.route-stop');
  const altEl = hud.querySelector('[data-alt]');
  const hdgEl = hud.querySelector('[data-hdg]');
  const stopEl = hud.querySelector('[data-stop]');

  let lastP = -1;
  const stopStates = Array.from({ length: 6 }, () => ({ active: false, passed: false }));   // one object per stop
  let lastActive = -2;
  let decodeTimer = null;
  let decodeLabel = null;

  function scrollToStop(k) {
    if (!section) return;
    const span = section.offsetHeight - window.innerHeight;   // measured now, so a resize can't leave it stale
    const target = section.offsetTop + span * (k + 1) / 6;
    window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
  }

  route.addEventListener('click', e => {
    const btn = e.target.closest('.route-stop');
    if (btn) scrollToStop(Number(btn.dataset.k));
  });

  function setText(el, val) {
    if (el.textContent !== val) el.textContent = val;
  }

  function startDecode(label, original) {
    if (reduced) { label.lastChild.textContent = original; return; }
    if (decodeTimer && decodeLabel === label) return;                 // already decoding this one
    if (decodeTimer) {                                                 // interrupted: put the previous label back
      cancelAnimationFrame(decodeTimer); decodeTimer = null;
      if (decodeLabel) decodeLabel.lastChild.textContent = originalTexts.get(decodeLabel) || decodeLabel.lastChild.textContent;
    }
    decodeLabel = label;
    const textNode = label.lastChild;
    const len = original.length;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>_+';
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / 420);
      let out = '';
      for (let i = 0; i < len; i++) {
        const ch = original[i];
        if (ch === ' ') { out += ' '; continue; }
        const resolveAt = (i + 1) / len;
        out += t >= resolveAt ? ch : chars[Math.random() * chars.length | 0];
      }
      textNode.textContent = out;
      if (t < 1) decodeTimer = requestAnimationFrame(tick);
      else { textNode.textContent = original; decodeTimer = null; decodeLabel = null; }
    }
    decodeTimer = requestAnimationFrame(tick);
  }

  function update(state) {
    const { p, active, alt, heading } = state;
    const arrived = active !== lastActive;
    if (Math.abs(p - lastP) > 0.002) {
      fill.style.transform = `scaleY(${p})`;
      lastP = p;
    }
    stops.forEach((btn, k) => {
      const st = stopStates[k];
      const isActive = k === active;
      const isPassed = (k + 1) / 6 <= p + 0.02 && !isActive;
      if (st.active !== isActive) { btn.classList.toggle('is-active', isActive); st.active = isActive; }
      if (st.passed !== isPassed) { btn.classList.toggle('is-passed', isPassed); st.passed = isPassed; }
    });
    setText(altEl, String(Math.max(0, Math.round(alt))).padStart(3, '0'));
    setText(hdgEl, String(Math.round(heading) % 360).padStart(3, '0'));
    setText(stopEl, active >= 0 ? String(active + 1).padStart(2, '0') : '--');
    if (active !== lastActive && active >= 0 && active < labels.length) {   // decode once per arrival, not every frame
      const label = labels[active];
      const original = originalTexts.get(label) || '';
      if (original) startDecode(label, original);
    }
    if (arrived) lastActive = active;
  }

  function setVisible(on) {
    const has = hud.classList.contains('is-on');
    if (has !== on) { hud.classList.toggle('is-on', on); route.classList.toggle('is-on', on); }
  }

  return { update, setVisible };
}