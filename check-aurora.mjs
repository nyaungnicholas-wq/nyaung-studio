// Verify gate for aurora.js — syntax + required structural features.
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const src = readFileSync(new URL('./aurora.js', import.meta.url), 'utf8');

// must parse as a plain (non-module) script
new Function(src);

assert.ok(!/^\s*(import|export)\s/m.test(src), 'must be a plain script, no ESM');
assert.match(src, /hero-canvas/, 'must use the existing #hero-canvas');
assert.match(src, /getContext\(\s*['"]webgl['"]/, 'must use raw WebGL1');
assert.match(src, /prefers-reduced-motion/, 'must respect reduced motion');
assert.match(src, /max-width:\s*768px/, 'must skip WebGL on mobile like scene.js');
assert.match(src, /u_time/, 'time uniform');
assert.match(src, /u_mouse/, 'mouse uniform');
assert.match(src, /u_scroll/, 'scroll uniform');
assert.match(src, /resize/, 'must handle resize');
assert.match(src, /pointermove|mousemove/, 'must track cursor');
assert.match(src, /fbm|noise/, 'must be noise-driven');
assert.ok(!/from\s+['"]three/.test(src) && !/THREE\./.test(src), 'no Three.js');
// interactive edition requirements
assert.match(src, /u_trail/, 'cursor wake trail uniform');
assert.match(src, /u_clicks/, 'click shockwave uniforms');
assert.match(src, /pointerdown|click/, 'click listener');
assert.match(src, /gl_PointCoord/, 'dust mote point sprites');
assert.match(src, /gl\.POINTS/, 'dust mote draw pass');
assert.match(src, /u_streak|streak/, 'gold light streak');
console.log('aurora.js checks pass');
