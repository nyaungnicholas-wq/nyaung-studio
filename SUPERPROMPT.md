# NYAUNG STUDIO — Website Super Prompt (build spec)

Build a premium, **multi-page**, **3D-throughout** business website for **Nyaung Studio** — an independent product & AI studio run by Natalie Nyaung. Self-contained static site (no framework/build), served locally by `server.py` (no-cache) on port 5190.

## Goals (from the client)
Primary: **(1) win client / freelance work, (2) showcase credibility & range, (3) attract investors / partners.** Not job-hunting. So: confident studio/venture voice, results-forward, "here's what we've shipped," clear "start a project / let's talk" CTAs.

## Information architecture (5 real pages, shared chrome)
- `index.html` — **Home**: intro preloader → hero → capabilities → featured work → results band → services teaser → CTA.
- `about.html` — **About**: the story (written from the work, editable placeholders), what the studio is, approach/values, by-the-numbers, disciplines, photo placeholder.
- `work.html` — **Work**: ALL projects (currently 14), filterable, each with a result, click-through modal. This is the proof.
- `services.html` — **Services**: detailed offerings, process, engagement model, FAQ, CTA.
- `contact.html` — **Contact**: contact form (mailto-based, no backend) + email (dimples.n3fam@gmail.com) + what-to-expect.

Shared nav (active state per page), shared footer, shared 3D background, shared design system — injected via `components.js` so they never drift.

## Non-negotiable requirements (the client's explicit asks)
1. **3D through the WHOLE scroll, on every page.** The WebGL scene is a persistent living background that never fully disappears — prominent in the hero, then settles to a calm atmospheric floor (~0.2 opacity) for the rest of each page, still rotating and reacting to scroll. Content stays readable via a global scrim + opaque content panels.
2. **Show ALL the work — robustly.** Every genuine project renders, even if IntersectionObserver/JS hiccups: reveal system has a hard fallback (force-show after timeout) so content is NEVER invisible. (The "I don't see anything" issue = stale cache + reveal-gated content; both fixed.)
3. **Say something at the very beginning.** A real site **preloader/intro** on first visit: brand mark + a warm welcome line (e.g., "Welcome — here's what I've been building."), animates, then reveals the site. Skippable; shows once per session (sessionStorage); never blocks content.
4. **Multi-page**, business-grade, "ask everything" — built from real answers, not lorem.

## Design system (keep consistent with existing build)
- Dark, motion-driven, premium. Indigo→violet brand (`#6366F1`/`#8B5CF6`), emerald (`#34D399`) for "live"/results. Satoshi (display) + General Sans (body) via Fontshare.
- Floating glass nav, bento, gradient project emblems, glass cards, scroll reveals, Lenis smooth scroll, GSAP scroll motion.
- WCAG AA: contrast ≥4.5:1, focus states, 44px touch targets, reduced-motion safe, aria.

## 3D scene (scene.js)
Wireframe icosahedron that morphs into a torus knot, glowing core orb, orbit ring, parallax starfield. Scroll-driven: travel, multi-turn spin, camera flythrough + roll + FOV warp, violet→fuchsia→emerald colour shift, starfield streak. **Persistent**: opacity floors at ~0.2 (never 0) so it's present the whole scroll. Runs on every page (re-inits per page, maps to that page's scroll). Reduced-motion → single static frame. Progressive enhancement: CSS ambient background carries it if WebGL/CDN fail.

## Content rules
- Truthful. Real results/metrics where they exist (CAGR, live URLs, posting cadence, test counts); "built/verified" outcomes otherwise. No invented revenue/user numbers.
- **Integrity:** only the studio's OWN builds. External clones (graphify = Safi Shamsi's; ArcReel) stay excluded. Jarvis = Natalie's custom Iron Man assistant only (no OpenJarvis/Stanford branding).
- Bio/About: written from the projects with clearly-marked `[EDIT: …]` placeholders for personal facts.

## Contact
Email `dimples.n3fam@gmail.com` + a contact form that builds a `mailto:` (name, project type, budget/timeline, message) — works with no backend. No social links were provided (omit until given).

## Tech / robustness
- Files: `index/about/work/services/contact.html`, `styles.css`, `scene.js` (module, three@0.160 importmap), `motion.js` (Lenis+GSAP via CDN), `data.js`, `app.js`, `components.js`, `server.py`.
- Cache-busting `?v=` on local assets; no-cache dev server.
- Per-page `<html data-page="…">` drives nav active state + which inits run.
- No console errors; works at 375/768/1024/1440; no horizontal overflow.

## Acceptance criteria
- [ ] 5 pages, shared nav/footer/3D, active nav state correct.
- [ ] 3D visible & moving across the entire scroll of every page.
- [ ] Intro preloader greets on first visit, then reveals; skippable; once per session.
- [ ] All 14 projects visible on Work (and featured on Home) with results; modal works; content never stuck hidden.
- [ ] About reads as a real story with editable placeholders.
- [ ] Services detailed (offerings + process + FAQ). Contact form builds a mailto.
- [ ] No console errors; responsive; a11y intact.
