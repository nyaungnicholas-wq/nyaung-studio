# v2 homepage — handoff (2026-11-11)

Preview: `python server.py` then http://localhost:5190/v2.html (noindex; NOT deployed; index.html untouched).
Reference: Dominik Fojcik portfolio reel, instagram.com/p/DfmUw6fh7Tb. Asked: "make my website like this".
Approach: same structure and mechanisms (loader, curved-grid LED portrait hero, curved WebGL work cards,
scroll-driven 3D worlds, pixel type, red contact finale); his renders/copy not used — all scenes are ours.

Chapters (one fixed canvas, each chapter -> offscreen RT -> post shader in main.js):
1. hero.js    barrel grid + quadtree cells on the portrait silhouette, mint outline, LED-scanline fill, mouse lens
2. work.js    4 screenshots on curved cards over paper #EDEDEA; bend on scroll speed; click = case study
3. tunnel.js  order-book corridor (bids green left, asks red right, trade tape floor) = ABOUT
4. city.js    night city from above, rotating descent into a red skylight = WHAT I BUILD
5. contact.js red-lantern street photo + cursor trail distortion + embers (procedural red smoke if photo missing)
Transitions (post, main.js POST): page lift / smear / light burst / portal out of the skylight.

Assets: v2/img/portrait.png = rembg cut of assets/portrait.jpg cropped to y>=330. work-*.jpg = 1440x900
screenshots of the live sites (signaldeck = local case page). contact.jpg = Canva AI image (media MAHarscfJeg).
Firefly via Photoshop MCP failed twice (returned textures, ignored prompt) — don't retry that route blind.

Verified (Playwright Chromium): 0 console errors desktop 1440x900 + phone 390x844, no horizontal overflow,
no-WebGL fallback (portrait + image grid), reduced-motion static frame. NOT verified: Safari/iOS, real GPU
perf on a weak laptop, Firefox. Not watched by Nicholas yet — no verdict.

Open: other pages (about/work/services/...) still use the old maximalist style. Going live = make v2.html
the index (current index.html holds the approved-but-undeployed 4-project cut; work tree has uncommitted work).
Dev trap: Chromium caches ES modules hard — disable cache (CDP Network.setCacheDisabled) when re-testing.

## After the fresh-context review (same day)
Fixed: ColorManagement off (hex now displays as written), no-WebGL shows nav/hero text, 12 s head-script fallback
if the 3D never starts, menu above nav-close + page inert while open, only on-screen chapters update, pointer speed
maths, phone tunnel travel scales with its column count, hero centring (intro uses `translate`, not `transform`),
hidden captions unfocusable, skip link moves focus, renderer sized from the 100lvh canvas (phone toolbar = no realloc).
Tuned beyond the briefs on purpose: work uCurve 0.9 / bend x3.2 / phone layout; hero phone H 0.66, LED 1/130;
tunnel lit with Lambert + hemi/dir lights; text panels have a dark backing.
Known, not fixed: city street lines sit off the real block gaps, amber street lights never render, 2-/4-lot sizes
leave blocks half empty; tunnel re-uploads full instance buffers each visible frame; card clicks test the flat
plane, not the curve; WebGL1 shrinks the 1440x900 screenshots. Proof Desk item site-v2-immersive-v1 (stills are
pre-review; asset storage full, current stills in v2/proof/*-v2.jpg).

## Revision 1 — "a little too much, make it professional" (Nicholas, 2026-11-11, on the local v2 build)
His words: "it's not bad but ... it's too much a lil ... make it professional". Kept structure, pulled effects back:
display type Tiny5 -> Geist 500 (mono stays for labels), no text glows, no blinking dots, scroll cue bottom-right;
hero barrel 0.16->0.10, grid dimmer, mint outline settles to a faint rim, glitch removed, rainbow lens ring -> thin
neutral rim; post fringing/grain/vignette roughly halved, light-burst flash halved, smear softer; tunnel slabs graphite
with green/red only on the deepest levels, fewer fills, smaller FOV kick; cards bend/split less; contact embers and
wobble reduced. Not re-posted to Proof Desk (asset storage full).

## Revision 2 — everything in one page (Nicholas, 2026-11-11: "can you not make it so that it goes to another thing ... I want it all in one thing")
No link on v2.html leaves the page any more (live product sites, GitHub and mailto still open in a new tab).
Hash-routed full-screen panels (v2/panel.js + v2/panel.css, shell `#panel` in v2.html):
`#/work/<slug>` (rendered from data.js; Prev/Next across the 4 selected), `#/archive` (all 33, by category),
`#/about` `#/services` `#/writing` `#/now` `#/contact` (inline `<template id="tpl-*">`, text extracted verbatim from
the old pages; contact keeps the real form + /api/contact -> Formspree -> mailto chain from app.js).
Behaviour: Close/Escape/back button close; closing returns to the exact scroll spot (history.scrollRestoration =
manual); deep links open on load; menu sits above panels; plain anchors (#work, #hero) close a panel first;
WebGL pauses while a panel is open. Verified in Chromium: all routes, pager, archive row, card pick, form validation,
deep link on phone, title restore, 0 console errors. Not verified: an actual form send (needs the Vercel function).
Old pages still exist for SEO; the panel copy is a snapshot of them — edit both, or regenerate the templates.

## Revision 3 — the city is a site map (Nicholas, 2026-11-11: "make this a mind map, like for the menu ... destination, and it doesn't directly go to the red one")
v2/citymap.js: five destination towers (Work, About, Services, Writing, Now) that are the peaks of their
neighbourhoods (capHeight), mint roof pads + light beams, glowing tube links (spokes to the red centre + ring links
between neighbours) with travelling pulses. Camera route (pose): overview -> each destination in menu order
(hop up and over, pause) -> drop into the red skylight -> portal into contact. #clients is 440vh for the stops.
DOM labels `.mm-node` (in #clients) are real links to the panels; main.js projects the rooftops each frame,
marks the current stop active (desc + arrow), hides off-screen ones, flips labels near the right edge.
Portrait phones get a wider lens on the overview. Verified Chromium desktop + 390px: route, active labels,
label click -> panel, Escape back, portal, 0 console errors. Known: on phones the overview shows 4 of 6 labels.

## Revision 4 — better jumps + more motion on the map (Nicholas, 2026-11-11: "make the jump graphic better on the building pages, and add some more motion graphic")
Jump (citymap.js pose): plateau + easeInOutCubic, cubic-Bezier flight with a small pull-back before take-off and an
arc up and over, look-ahead (view swings to the next stop early), slight bank into the turn, lens breathes +8° mid-air.
A light packet with a 14-sprite trail races along the link being travelled (that link brightens); landing fires a
double ripple on the roof and a beam flare. Post shader (main.js) adds a radial speed blur driven by the camera's
speed, map section only. Motion layer: route rail of the 6 stops (right edge, fill line, click to fly there),
ALT/HDG/STOP telemetry (top-left), label text decodes on arrival (maphud.js), roof rings rotate, two pulses per
link, radar ping over the overview. Phones: rail hidden, readout kept. Verified Chromium desktop + 390px, 0 errors.
Fixed worker bugs: Bezier control points overwrote themselves; subScaledVector (not in r160); HUD stops shared one
state object; decode re-ran every frame and left scrambled text when interrupted.

## Revision 5 — auto pull-up + filled tunnel (Nicholas, 2026-11-12: "make it so that it pulls up automatically" + "add something here since it's just empty space")
Read "pull up" as: landing on a map stop pulls up that destination's content by itself. v2/mappreview.js: a card
(bottom-left, replaces the THE MAP box while parked) slides up 260 ms after landing with title, lede, three items and
"> Open ..." into the full panel; drops away on take-off. Content comes from the inline templates / data.js.
Tunnel (About): v2/tunnelchart.js = candlestick chart down the middle (bodies, wicks, floor volume, glowing price line)
that builds itself ~20-34 units ahead of the camera; v2/tradestream.js = trade streaks flying past in the upper middle.
ROOT-CAUSE FIX: the floor shader interpolated per-vertex view distance across its two huge triangles (~76 units under
the camera), so fog blacked out the floor since the original build — now distance is per pixel (vViewPos). Also
removed pow() with a negative base (NaN on ANGLE). Floor now shows grid, green/red wall glow, moving tape.
Verified Chromium 1440 + 390: all 5 cards, CTA -> panel -> Escape, 0 console errors, no overflow.

## Revision 6 — 2026-11-12 (his answers: lock until click / building identity + data overlays / studio-split contact)
- SignalDeck card image was a screenshot of the old portfolio case page; replaced with the real app (localhost:8323, the
  local SignalDeck web). Old file kept in the session scratchpad only.
- v2/maptour.js: scrolling HOLDS at each map stop (wheel, touch, keys, scrollbar) until "Next stop" on the card; scrolling
  up always works; route rail, "Skip the map", #/contact links and anchors release it (event 'v2:release'); never blocks
  input inside an open panel or the menu.
- v2/citydeco.js: per-destination rooftop wireframe icon (stacked cards / globe / cube / open book / clock), antenna with
  blinking warning light, and on the active tower corner rails, rotating segmented + tick rings, rising scan square.
- Contact: split layout (left: headline, lede, availability, reply time, email, GitHub, 3 steps; right: the real form in a
  glass panel), darker calmer red. The form moved out of the #/contact panel (template deleted, no duplicate ids);
  #/contact now scrolls to the section. Copy verbatim from contact.html / now.html.
Verified Chromium 1440 + 390: wheel-held at stop 1, Next -> stop 2 and held, panel scrolls while parked, Skip -> contact,
form validation, 0 errors, no overflow. Not tested: real form send, Safari/iOS touch locking.

## LIVE — 2026-11-12 (his "Yes, make it live")
index.html = v2.html + the old canonical/OG/twitter/JSON-LD head, noindex removed. The previous homepage is kept as
index-classic.html (noindex, unlinked). .vercelignore keeps v2/HANDOFF.md and v2/proof off the site.
Deployed `npx vercel --prod --yes` (account nyaungnicholas-2986). Verified on https://nicholasnyaung.com in Chromium:
loads with WebGL (no CSP blocks), 0 console errors, map card + Skip -> contact, deep link #/work/lotline opens.
/api/contact responds (405 to OPTIONS); a real form send was NOT tested (would email him). Nothing committed to git.
v2.html still exists (noindex) - edit index.html from now on, or re-copy v2.html into it.
