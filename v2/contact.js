import * as THREE from 'three';

export default function createContact(ctx) {
  const { THREE: T, renderer, textures, width, height, dpr, isMobile, reducedMotion } = ctx;

  const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const SIZE = isMobile ? 128 : 256;
  const isWebGL2 = renderer.capabilities.isWebGL2;
  const ENC = isWebGL2 ? 0 : 1;
  const texType = isWebGL2 ? T.HalfFloatType : T.UnsignedByteType;

  const trailRT = [
    new T.WebGLRenderTarget(SIZE, SIZE, { type: texType, minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: false }),
    new T.WebGLRenderTarget(SIZE, SIZE, { type: texType, minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: false })
  ];
  let read = 0, write = 1;

  const trailScene = new T.Scene();
  const trailCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const trailGeo = new T.PlaneGeometry(2, 2);
  const trailMat = new T.ShaderMaterial({
    depthTest: false,
    uniforms: {
      uPrev: { value: trailRT[read].texture },
      uMouse: { value: new T.Vector2(0.5, 0.5) },
      uDelta: { value: new T.Vector2(0, 0) },
      uAspect: { value: width / height },
      uEnc: { value: ENC }
    },
    vertexShader: VERT,
    fragmentShader: `
      uniform sampler2D uPrev;
      uniform vec2 uMouse;
      uniform vec2 uDelta;
      uniform float uAspect;
      uniform int uEnc;
      varying vec2 vUv;

      vec2 decode(vec2 enc) { return (enc - 0.5) * 2.0; }
      vec2 encode(vec2 v) { return 0.5 + v * 0.5; }

      void main() {
        vec2 prevVel = uEnc == 1 ? decode(texture2D(uPrev, vUv).xy) : texture2D(uPrev, vUv).xy;
        vec2 advectUv = vUv - prevVel * 0.004;
        vec3 prev = uEnc == 1
          ? vec3(decode(texture2D(uPrev, advectUv).xy), texture2D(uPrev, advectUv).z)
          : vec3(texture2D(uPrev, advectUv).xy, texture2D(uPrev, advectUv).z);

        vec3 v = prev * 0.962;

        vec2 diff = (vUv - uMouse) * vec2(uAspect, 1.0);
        float dd = length(diff);
        float splat = exp(-dd * dd / 0.0036);

        v.xy += uDelta * 6.0 * splat;
        v.z += splat * min(1.0, length(uDelta) * 40.0);

        v = clamp(v, vec3(-1.0, -1.0, 0.0), vec3(1.0, 1.0, 1.0));

        if (uEnc == 1) {
          gl_FragColor = vec4(encode(v.xy), v.z, 1.0);
        } else {
          gl_FragColor = vec4(v.xy, v.z, 1.0);
        }
      }
    `
  });
  const trailMesh = new T.Mesh(trailGeo, trailMat);
  trailScene.add(trailMesh);

  const neutralColor = ENC ? 0x808000 : 0x000000;
  const prevRT = renderer.getRenderTarget();
  const prevClear = renderer.getClearColor(new T.Color()).getHex();
  renderer.setRenderTarget(trailRT[0]);
  renderer.setClearColor(neutralColor, 1);
  renderer.clear();
  renderer.setRenderTarget(trailRT[1]);
  renderer.clear();
  renderer.setRenderTarget(prevRT);
  renderer.setClearColor(prevClear, 1);

  const dispScene = new T.Scene();
  const dispCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const dispGeo = new T.PlaneGeometry(2, 2);

  const contactTex = textures.contact;
  let uImgAspect = 16 / 9;
  if (contactTex) {
    contactTex.minFilter = T.LinearFilter;
    contactTex.magFilter = T.LinearFilter;
    contactTex.generateMipmaps = false;
    contactTex.needsUpdate = true;
    uImgAspect = contactTex.image?.width / contactTex.image?.height || 16 / 9;
  }

  const dispMat = new T.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTex: { value: contactTex },
      uHasTex: { value: contactTex ? 1 : 0 },
      uTrail: { value: trailRT[read].texture },
      uEnc: { value: ENC },
      uTime: { value: 0 },
      uImgAspect: { value: uImgAspect },
      uScreenAspect: { value: width / height },
      uPush: { value: 0 },
      uMouse: { value: new T.Vector2(0.5, 0.5) },
      uPar: { value: new T.Vector2(0, 0) },
      uReduced: { value: reducedMotion ? 1 : 0 }
    },
    vertexShader: VERT,
    fragmentShader: `
      uniform sampler2D uTex;
      uniform float uHasTex;
      uniform sampler2D uTrail;
      uniform int uEnc;
      uniform float uTime;
      uniform float uImgAspect;
      uniform float uScreenAspect;
      uniform float uPush;
      uniform vec2 uMouse;
      uniform vec2 uPar;
      uniform float uReduced;
      varying vec2 vUv;

      vec2 decode(vec2 enc) { return (enc - 0.5) * 2.0; }

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p *= 2.0;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = vUv - 0.5;
        if (uScreenAspect > uImgAspect) {
          uv.y *= uImgAspect / uScreenAspect;
        } else {
          uv.x *= uScreenAspect / uImgAspect;
        }
        uv /= mix(1.12, 1.0, uPush);
        uv += 0.5 + uPar;

        vec3 t = uEnc == 1 ? vec3(decode(texture2D(uTrail, vUv).xy), texture2D(uTrail, vUv).z)
                           : texture2D(uTrail, vUv).xyz;
        vec2 disp = t.xy;
        float amt = t.z;

        uv += disp * 0.04;
        uv += vec2(sin(vUv.y * 40.0 + uTime * 1.2), cos(vUv.x * 30.0 + uTime)) * 0.0005 * (1.0 - uReduced);

        vec2 ca = disp * 0.006 + vec2(0.0004, 0.0);
        vec3 col;
        if (uHasTex > 0.5) {
          col = vec3(
            texture2D(uTex, uv + ca).r,
            texture2D(uTex, uv).g,
            texture2D(uTex, uv - ca).b
          );
        } else {
          float f = fbm(uv * 3.0 + vec2(0.0, uTime * 0.03));
          col = mix(vec3(0.07, 0.0, 0.0), vec3(0.78, 0.07, 0.04), f) + vec3(0.25, 0.03, 0.0) * pow(f, 4.0);
        }
        col *= 1.0 + amt * 0.25;

        // calmer backdrop for the split layout: dimmer overall, darkest behind the left-hand text
        col *= 0.62 * mix(0.6, 1.0, smoothstep(0.05, 0.75, vUv.x));
        col *= mix(0.45, 1.0, smoothstep(0.0, 0.16, vUv.y));

        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          vec2 g = vUv * vec2(16.0, 9.0) * (1.0 + fi * 0.7) + vec2(fi * 7.3, -uTime * (0.25 + fi * 0.12) * (1.0 - uReduced));
          vec2 id = floor(g);
          vec2 fr = fract(g) - 0.5;
          vec2 o = vec2(hash(id), hash(id + 4.1)) - 0.5;
          float d = length(fr - o * 0.7);
          float on = step(0.82, hash(id + 9.2));
          col += vec3(1.0, 0.45, 0.2) * on * smoothstep(0.05, 0.0, d) * (0.4 + 0.6 * hash(id + 2.0)) * 0.3;
        }

        col = pow(max(col, 0.0), vec3(1.05));
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  const dispMesh = new T.Mesh(dispGeo, dispMat);
  dispScene.add(dispMesh);

  const lastMouse = new T.Vector2(0.5, 0.5);
  const curMouse = new T.Vector2(0.5, 0.5);
  const delta = new T.Vector2(0, 0);
  const par = new T.Vector2(0, 0);

  function update(s) {
    const { time, dt, progress, mouse, mouseRaw } = s;
    const red = reducedMotion;

    dispMat.uniforms.uTime.value = time;
    dispMat.uniforms.uPush.value = red ? 1 : (progress < 0.6 ? progress / 0.6 * progress / 0.6 * (3.0 - 2.0 * progress / 0.6) : 1);

    curMouse.set(mouseRaw.x * 0.5 + 0.5, mouseRaw.y * 0.5 + 0.5);
    if (red) {
      delta.set(0, 0);
    } else {
      delta.subVectors(curMouse, lastMouse);
    }
    lastMouse.copy(curMouse);

    trailMat.uniforms.uMouse.value.copy(curMouse);
    trailMat.uniforms.uDelta.value.copy(delta);
    dispMat.uniforms.uMouse.value.copy(curMouse);

    const k = 1 - Math.pow(1 - 0.03, dt * 60);
    par.x += (-mouse.x * 0.012 - par.x) * k;
    par.y += (-mouse.y * 0.008 - par.y) * k;
    dispMat.uniforms.uPar.value.copy(par);
  }

  function resize(w, h) {
    const aspect = w / h;
    dispMat.uniforms.uScreenAspect.value = aspect;
    trailMat.uniforms.uAspect.value = aspect;
  }

  function prerender(r) {
    const prev = r.getRenderTarget();
    trailMat.uniforms.uPrev.value = trailRT[read].texture;
    r.setRenderTarget(trailRT[write]);
    r.render(trailScene, trailCam);
    [read, write] = [write, read];
    dispMat.uniforms.uTrail.value = trailRT[read].texture;
    r.setRenderTarget(prev);
  }

  resize(width, height);

  return {
    scene: dispScene,
    camera: dispCam,
    update,
    resize,
    prerender
  };
}