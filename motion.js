/* ============================================================
   NICHOLAS — smooth scroll (Lenis) + scroll motion (GSAP)
   Progressive enhancement: no-op if libs missing or reduced motion.
   Heavy transforms are gated off on mobile + reduced-motion.
   ============================================================ */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 768px)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  function init() {
    /* ---- Lenis smooth scroll (skip when reduced-motion) ---- */
    let lenis = null;
    if (!reduce && window.Lenis) {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
      window.__lenis = lenis;
      if (hasGsap) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((t) => lenis.raf(t * 1000));
        gsap.ticker.lagSmoothing(0);
      } else {
        const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }
      document.querySelectorAll('a[href^="#"]').forEach((a) => {
        a.addEventListener('click', (e) => {
          const id = a.getAttribute('href');
          if (!id || id.length < 2) return;
          const el = document.querySelector(id);
          if (!el) return;
          e.preventDefault();
          lenis.scrollTo(el, { offset: -76 });
        });
      });
      const backdrop = document.getElementById('modal-backdrop');
      if (backdrop) new MutationObserver(() => {
        backdrop.classList.contains('open') ? lenis.stop() : lenis.start();
      }).observe(backdrop, { attributes: true, attributeFilter: ['class'] });
    }

    /* ---- Premium scroll motion (desktop, motion-on only) ---- */
    if (hasGsap && !reduce && !mobile) {
      document.documentElement.classList.add('motion'); // arms CSS line-mask hidden state
      buildMotion();
      window.addEventListener('load', () => ScrollTrigger.refresh());
      setTimeout(() => ScrollTrigger.refresh(), 700);
      setTimeout(() => ScrollTrigger.refresh(), 1800);
    }
  }

  function buildMotion() {
    const ease = 'power3.out';

    // 1) LINE-MASK headline reveals — the shared signature on every page
    gsap.utils.toArray('.section-head h2, .page-hero h1, .moment-line').forEach((h) => {
      h.classList.add('lm-reveal'); // CSS (html.motion) sets clip-path inset(0 110% 0 0)
      gsap.to(h, {
        clipPath: 'inset(0 0% 0 0)', duration: 0.85, ease,
        scrollTrigger: { trigger: h, start: 'top 88%', once: true },
      });
    });

    // 2) HOME hero hands off to the 3D: content drifts up + fades on scroll
    if (document.querySelector('.hero .wrap')) {
      gsap.to('.hero .wrap', {
        yPercent: 16, opacity: 0, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });
    }

    // 3) Gentle parallax on the grids/bento (depth without clutter)
    gsap.utils.toArray('.bento, #featured-grid, #proj-grid').forEach((el) => {
      gsap.fromTo(el, { y: 24 }, {
        y: -24, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // 4) ABOUT: sticky-ish portrait parallax
    const portrait = document.querySelector('.portrait');
    if (portrait) {
      gsap.fromTo(portrait, { y: 26 }, {
        y: -26, ease: 'none',
        scrollTrigger: { trigger: '.about-hero-grid', start: 'top bottom', end: 'bottom top', scrub: true },
      });
    }

    // 5) CONTACT: form fields cascade up as the form enters
    //    (fields are NOT .reveal elements, so this won't fight the IO reveal system)
    const form = document.getElementById('contact-form');
    if (form) {
      gsap.from(form.querySelectorAll('.field'), {
        y: 18, opacity: 0, duration: 0.5, ease: 'power2.out', stagger: 0.07,
        scrollTrigger: { trigger: form, start: 'top 82%', once: true },
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
