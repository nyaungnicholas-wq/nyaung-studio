# Nicholas — Studio Site

The portfolio + business site for **Nicholas**, an independent product & AI studio run by Nicholas Nyaung. One builder; twenty-one products shipped end to end across SaaS, AI agents, quant/trading, websites, and content engines.

It's a **self-contained static site** — vanilla HTML/CSS/JS, **no build step, no framework, no dependencies to install**. The fancy parts (custom WebGL/GLSL background, ⌘K command palette, scroll motion) all load from CDNs at runtime and degrade gracefully if they fail.

---

## Run it locally

A tiny no-cache server is included so edits show on reload:

```bash
python3 server.py        # serves on http://localhost:5190
```

(Or use any static server — `npx serve`, VS Code Live Server, etc. The `.claude/launch.json` config is named `nyaung-studio`, port 5190.)

---

## Project structure

| File | What it is |
|------|------------|
| `index.html` · `about.html` · `work.html` · `services.html` · `writing.html` · `contact.html` | The six main pages |
| `work-<slug>.html` (×14) | Per-project case studies — **generated**, don't edit by hand |
| `data.js` | `NS_PROJECTS` (all project content) + `NS_TESTIMONIALS` (empty until you add real quotes) |
| `gen-cases.mjs` | Regenerates the 14 case-study pages from `data.js` |
| `build-data.mjs` | (Optional) rebuilds `data.js` from `.enriched.json` |
| `app.js` | Cards, project modal, filters, contact form |
| `scene.js` | Three.js background (glass-core shader, bloom, drag-to-explore) |
| `motion.js` · `premium.js` · `interactive.js` | Lenis/GSAP motion · cursor glow + magnetic · tilt/spotlight, ⌘K palette, section nav, sound |
| `components.js` | Shared nav / footer / preloader / social links |
| `assistant.js` | The on-page "Studio Assistant" (canned knowledge base, no backend) |
| `styles.css` | All styles |
| `assets/` | favicon, icons, OG image |

### Regenerate the case pages after editing `data.js`

```bash
node gen-cases.mjs       # rewrites all 14 work-*.html
```

---

## Deploy

It's static, so it deploys anywhere for free. Pick one:

- **Vercel** — `npx vercel` (or drag the folder onto vercel.com). `vercel.json` sets cache + security headers.
- **Netlify** — drag the folder onto app.netlify.com, or `netlify deploy`. `netlify.toml` configures it (publish = root, no build).
- **Cloudflare Pages** — connect the repo; framework preset = **None**, build command empty, output dir = `/`. `_headers` is applied automatically.
- **GitHub Pages** — push to a repo, enable Pages on the branch root.

All four pick up `404.html` automatically. Then point your domain's DNS at the host.

---

## ✅ Pre-launch checklist

Fill these in before going live (everything works without them, but they're placeholders):

- [ ] **Domain** — replace the placeholder `nicholasnyaung.com` everywhere (titles, OG tags, `sitemap.xml`, `robots.txt`, JSON-LD). Find/replace does it.
- [ ] **Contact form** — three options, in `app.js`'s delivery order (each falls back to the next):
  1. **Resend (recommended — branded email from your domain):** deploy on a host with serverless functions (Vercel/Netlify), set `CONTACT_ENDPOINT = '/api/contact'` in `app.js`, and add env vars `RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM` (a verified-domain sender). The key stays server-side in `api/contact.js`. Needs your domain verified in Resend.
  2. **Formspree (no backend):** set `FORMSPREE_ID` in `app.js` (free at formspree.io).
  3. **Nothing set:** the form opens the visitor's email app via `mailto:` (current default).
- [ ] **Social links** — fill `SOCIAL = { github, linkedin }` in `components.js` to show the footer icons.
- [ ] **Photo** — drop a headshot at `assets/portrait.jpg`; it replaces the monogram on the About page automatically.
- [ ] **Testimonials** — add real quotes to `NS_TESTIMONIALS` in `data.js`; the "What clients say" section appears once it's non-empty.
- [ ] **Analytics** — the Plausible snippet is wired with `data-domain`; create the site in Plausible (or swap for GA) and match the domain.
- [ ] **Contact email** — currently `nyaungnicholas@gmail.com` (in `app.js`, `components.js`, `assistant.js`); change if you want a different public address.

---

Built solo. Designed to be honest: nothing on the site is claimed that isn't real.
