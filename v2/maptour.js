export default function createMapTour(section, { reducedMotion } = {}) {
  let released = -1;
  let prevY = window.scrollY;

  const stopY = (k) => section.offsetTop + (section.offsetHeight - window.innerHeight) * (k + 1) / 6;
  const endY = () => section.offsetTop + section.offsetHeight - window.innerHeight;
  const gate = () => released + 1;
  // never block input meant for an open panel or the menu (e.g. reading "About" opened from a card)
  const elsewhere = (e) => { const r = document.documentElement.classList; return r.contains('panel-open') || r.contains('menu-open') || !!(e.target && e.target.closest && e.target.closest('#panel, #menu, input, textarea, select')); };

  // 1. Scroll clamp
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    const g = gate();
    if (g <= 4 && y > stopY(g) + 2) {
      if (prevY <= stopY(g) + 2) {
        window.scrollTo({ top: stopY(g), behavior: 'instant' });
      } else {
        for (let k = 4; k >= 0; k--) {
          if (stopY(k) < y - 2) { released = k; break; }
        }
      }
    }
    prevY = y;
  }, { passive: true });

  // 2. Wheel block
  window.addEventListener('wheel', (e) => {
    const g = gate();
    if (!elsewhere(e) && g <= 4 && e.deltaY > 0 && Math.abs(window.scrollY - stopY(g)) < 6) e.preventDefault();
  }, { passive: false });

  // 3. Touch block
  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    const g = gate();
    if (!elsewhere(e) && g <= 4 && touchStartY - e.touches[0].clientY > 0 && Math.abs(window.scrollY - stopY(g)) < 6) e.preventDefault();
  }, { passive: false });

  // 4. Key block
  window.addEventListener('keydown', (e) => {
    const g = gate();
    const blockedKeys = [' ', 'PageDown', 'ArrowDown', 'End'];
    const isInput = elsewhere(e) || (e.target.matches && e.target.matches('[contenteditable]'));
    if (g <= 4 && Math.abs(window.scrollY - stopY(g)) < 6 && blockedKeys.includes(e.key) && !isInput) e.preventDefault();
  });

  // 5. next()
  function next() {
    const g = gate();
    if (g > 4) return;
    const k = g;
    released = k;
    const target = k < 4 ? stopY(k + 1) : endY() + 2;
    window.scrollTo({ top: target, behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  // 6. releaseTo / releaseAll
  function releaseTo(k) { released = Math.max(released, Math.min(4, k)); }
  function releaseAll() { released = 4; }

  // 7. v2:release event
  document.addEventListener('v2:release', releaseAll);

  // 8. Route rail click (capturing)
  document.addEventListener('click', (e) => {
    const stop = e.target.closest('.route-stop[data-k]');
    if (stop) releaseTo(Number(stop.dataset.k) - 1);
  }, true);

  return { next, releaseAll, releaseTo, get gate() { return gate(); } };
}