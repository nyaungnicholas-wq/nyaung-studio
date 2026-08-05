// Verify gate for story.js — syntax + required structural features.
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const src = readFileSync(new URL('./story.js', import.meta.url), 'utf8');

new Function(src); // must parse as a plain (non-module) script

assert.ok(!/^\s*(import|export)\s/m.test(src), 'plain script, no ESM');
assert.ok(!/THREE\./.test(src), 'no Three.js');
assert.match(src, /hero-canvas/, 'uses #hero-canvas');
assert.match(src, /getContext\(\s*['"]webgl['"]/, 'raw WebGL1');
assert.match(src, /aurora\.js/, 'falls back to aurora.js on bail');
assert.match(src, /prefers-reduced-motion/, 'reduced-motion respected');
assert.match(src, /max-width:\s*768px/, 'mobile skip');
assert.match(src, /gl_PointCoord/, 'soft point sprites');
assert.match(src, /a_seed/, 'seed attribute');
assert.match(src, /a_glyph/, 'glyph target attribute');
assert.match(src, /u_p1[\s\S]*u_p2[\s\S]*u_p3/, 'three morph progress uniforms');
assert.match(src, /measureText|fillText/, 'N glyph rasterized from canvas 2d');
assert.match(src, /getBoundingClientRect/, 'chapter progress from real sections');
assert.match(src, /u_mouse/, 'mouse uniform');
assert.match(src, /ONE\b.*ONE\b|gl\.ONE/, 'additive blending');
assert.match(src, /story-chapter/, 'chapter label element');
assert.match(src, /IDEA[\s\S]*BUILD[\s\S]*SHIP[\s\S]*LIVE/, 'four chapter names');
assert.match(src, /visibilitychange|document\.hidden/, 'hidden handling');
assert.match(src, /resize/, 'resize handling');
console.log('story.js checks pass');
