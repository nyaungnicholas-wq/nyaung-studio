import * as THREE from 'three';

export default function createHero(ctx) {
  const { THREE: T, renderer, textures, width, height, dpr, isMobile, reducedMotion } = ctx;

  const camera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const scene = new T.Scene();

  const portrait = textures.portrait;
  let uImgAspect = 0.9714;
  let uHasImg = 0;

  if (portrait) {
    portrait.minFilter = T.LinearFilter;
    portrait.magFilter = T.LinearFilter;
    portrait.wrapS = T.ClampToEdgeWrapping;
    portrait.wrapT = T.ClampToEdgeWrapping;
    portrait.generateMipmaps = false;
    portrait.needsUpdate = true;
    uImgAspect = portrait.image?.width / portrait.image?.height ?? 0.9714;
    uHasImg = 1;
  }

  const uReduced = reducedMotion ? 1 : 0;
  const uLed = isMobile ? 1.0 / 130.0 : 1.0 / 150.0;

  const uniforms = {
    uTime: { value: 0 },
    uIntro: { value: 0 },
    uProgress: { value: 0 },
    uVel: { value: 0 },
    uMouse: { value: new T.Vector2(0.5, 0.5) },
    uMouseVel: { value: 0 },
    uRes: { value: new T.Vector2(width * dpr, height * dpr) },
    uPortrait: { value: portrait },
    uImgAspect: { value: uImgAspect },
    uHasImg: { value: uHasImg },
    uReduced: { value: uReduced },
    uLed: { value: uLed }
  };

  const vertexShader = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

  const fragmentShader = `
varying vec2 vUv;
uniform float uTime;
uniform float uIntro;
uniform float uProgress;
uniform float uVel;
uniform vec2 uMouse;
uniform float uMouseVel;
uniform vec2 uRes;
uniform sampler2D uPortrait;
uniform float uImgAspect;
uniform float uHasImg;
uniform float uReduced;
uniform float uLed;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// portrait frame in q space (set at the top of main)
float gW; float gH; float gB;
vec2 imgUV(vec2 qq){ return vec2((qq.x + gW * 0.5) / gW, (qq.y - gB) / gH); }
float alphaAt(vec2 qq){
  vec2 uv = imgUV(qq);
  // below the image bottom, repeat the last row so the shoulders run off-screen instead of ending in an edge
  if (uHasImg < 0.5 || uv.x < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
  return texture2D(uPortrait, vec2(uv.x, max(uv.y, 0.002))).a;
}

void main(){
  float aspect = uRes.x / uRes.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);

  float k = 0.1 + 0.3 * uProgress;
  vec2 q = p * (1.0 + k * dot(p, p));

  vec2 m = (uMouse - 0.5) * vec2(aspect, 1.0);
  vec2 d = q - m;
  float dl = length(d);
  float R = 0.17;
  float lensAmt = smoothstep(R, 0.0, dl) * (0.25 + 0.75 * uMouseVel);
  if (uReduced > 0.5) lensAmt = 0.0;
  q -= d * lensAmt * 0.22;

  gH = (aspect >= 0.8) ? 0.97 : 0.66;
  gW = gH * uImgAspect;
  gB = -0.5;

  float cell = 1.0 / 11.0;
  float level = 0.0;
  float onEdge = 0.0;

  for (int L = 0; L < 4; L++) {
    vec2 c0 = floor(q / cell) * cell;
    float a00 = alphaAt(c0);
    float a10 = alphaAt(c0 + vec2(cell, 0.0));
    float a01 = alphaAt(c0 + vec2(0.0, cell));
    float a11 = alphaAt(c0 + vec2(cell));
    float amin = min(min(a00, a10), min(a01, a11));
    float amax = max(max(a00, a10), max(a01, a11));
    bool split = (amax - amin > 0.2) || (L < 2 && amin > 0.5);
    if (!split) break;
    if (L == 3 && (amax - amin > 0.2)) onEdge = 1.0;
    cell *= 0.5;
    level += 1.0;
  }

  float px = 1.0 / uRes.y;
  vec2 g = abs(fract(q / cell + 0.5) - 0.5) * cell;
  float line = 1.0 - smoothstep(0.0, px * 1.3, min(g.x, g.y));
  vec3 lineCol = vec3(0.79, 0.80, 0.82) * (0.42 - 0.08 * level);
  float gridReveal = smoothstep(0.0, 0.25, uIntro * 1.6 - length(p) * 0.9);

  float e = abs(alphaAt(q + vec2(px * 2.0, 0.0)) - alphaAt(q - vec2(px * 2.0, 0.0))) +
            abs(alphaAt(q + vec2(0.0, px * 2.0)) - alphaAt(q - vec2(0.0, px * 2.0)));
  float outline = smoothstep(0.05, 0.6, e);
  // the mint outline is an intro beat: it settles to a faint rim instead of glowing for good
  float outlinePhase = smoothstep(0.18, 0.42, uIntro) * (1.0 - 0.85 * smoothstep(0.7, 1.0, uIntro));
  vec3 outlineCol = vec3(0.66, 0.94, 0.82);

  vec2 ledId = floor(q / uLed);
  vec2 ledC = (ledId + 0.5) * uLed;


  vec2 uvC = imgUV(ledC);
  vec4 c = texture2D(uPortrait, clamp(uvC, 0.0, 1.0));
  float aC = alphaAt(ledC);
  float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));

  vec2 f = fract(q / uLed) - 0.5;
  float stripe = smoothstep(0.5, 0.26, abs(f.x)) * (0.6 + 0.4 * smoothstep(0.5, 0.25, abs(f.y)));
  vec3 ledCol = mix(vec3(lum), c.rgb, 0.5) * 1.3 * vec3(0.92, 1.0, 1.05);
  ledCol = pow(ledCol, vec3(1.12));

  float fillT = smoothstep(0.42, 1.0, uIntro);
  float th = fillT * 1.4 - (1.0 - uvC.y) * 0.4 - hash(ledId) * 0.3 * (1.0 - fillT);
  float fill = smoothstep(0.0, 0.04, th);
  if (uReduced > 0.5) fill = step(0.5, uIntro);

  vec3 col = vec3(0.018, 0.018, 0.022);
  col += lineCol * line * gridReveal * (1.0 - 0.8 * aC * fill);
  col += outlineCol * (outline * 1.0 + onEdge * line * 0.6) * outlinePhase;
  col += ledCol * stripe * aC * fill;

  col *= 0.96 + 0.04 * sin(vUv.y * uRes.y * 1.5708);

  // lens rim: a thin neutral highlight while the pointer moves (was a rainbow ring)
  float ring = smoothstep(0.006, 0.0, abs(dl - R * 0.6)) * uMouseVel;
  if (uReduced < 0.5) col += vec3(0.75, 0.82, 0.85) * ring * 0.22;

  col *= 1.0 - 0.3 * smoothstep(0.65, 1.0, uProgress);
  gl_FragColor = vec4(col, 1.0);
}
`;

  const material = new T.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false
  });

  const geometry = new T.PlaneGeometry(2, 2);
  const mesh = new T.Mesh(geometry, material);
  scene.add(mesh);

  function update(s) {
    uniforms.uTime.value = s.time;
    uniforms.uIntro.value = s.intro;
    uniforms.uProgress.value = s.progress;
    uniforms.uVel.value = s.velocity;
    uniforms.uMouse.value.set(s.mouse.x * 0.5 + 0.5, s.mouse.y * 0.5 + 0.5);
    uniforms.uMouseVel.value = s.mouseVel;
  }

  function resize(w, h) {
    uniforms.uRes.value.set(w * dpr, h * dpr);
  }

  resize(width, height);

  return { scene, camera, update, resize };
}