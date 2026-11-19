export default function createMapTour(section, { reducedMotion } = {}) {
  let released = -1;

  const stopY = (k) => section.offsetTop + (section.offsetHeight - window.innerHeight) * (k + 1) / 6;
  const endY = () => section.offsetTop + section.offsetHeight - window.innerHeight;
  const gate = () => released + 1;
  // never block input meant for an open panel or the menu (e.g. reading "About" opened from a card)

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