/* ============================================================
   NICHOLAS — premium micro-interactions
   Scroll progress bar (all devices), custom cursor glow +
   magnetic buttons (fine-pointer, motion-on only).
   ============================================================ */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;

  function init() {
    /* ---- scroll progress bar ---- */
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    document.body.appendChild(bar);
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(window.scrollY / h, 1) : 0) + ')';
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    if (reduce || !fine) return; // cursor + magnetic = desktop, motion-on only

    /* ---- custom cursor glow ---- */
    const cur = document.createElement('div');
    cur.className = 'cursor-glow';
    document.body.appendChild(cur);
    let mx = window.innerWidth / 2, my = window.innerHeight / 2, cx = mx, cy = my;
    window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    const loop = () => {
      cx += (mx - cx) * 0.2; cy += (my - cy) * 0.2;
      cur.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    const INTERACTIVE = 'a, button, .proj, .bento-card, .feature, input, select, textarea, summary, .filter';
    document.addEventListener('pointerover', (e) => {
      cur.classList.toggle('big', !!(e.target.closest && e.target.closest(INTERACTIVE)));
    });
    document.addEventListener('pointerdown', () => cur.classList.add('press'));
    document.addEventListener('pointerup', () => cur.classList.remove('press'));

    /* ---- magnetic buttons ---- */
    const magnetize = (btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${dx * 0.28}px, ${dy * 0.4}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    };
    document.querySelectorAll('.btn-primary').forEach(magnetize);
    // re-magnetize any buttons injected later (nav CTA)
    setTimeout(() => document.querySelectorAll('.btn-primary:not([data-mag])').forEach((b) => { b.dataset.mag = '1'; magnetize(b); }), 300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
