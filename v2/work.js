import * as THREE from 'three';

export default function createWork(ctx) {
  const { THREE: T, renderer, textures, width, height, isMobile, reducedMotion } = ctx;

  const scene = new T.Scene();
  scene.background = new T.Color(0xEDEDEA);

  const camera = new T.PerspectiveCamera(35, width / height, 0.1, 100);
  camera.position.set(0, 0, 10);

  const deck = new T.Group();
  scene.add(deck);

  const geometry = new T.PlaneGeometry(1, 1, 40, 40);

  const vertexShader = `
    uniform float uBend; uniform float uCurve;
    varying vec2 vUv; varying float vZ;
    void main(){
      vUv = uv;
      vec3 pos = position;
      pos.z -= uCurve * pos.x * pos.x * 2.0;
      pos.z += uBend * (0.25 - pos.y * pos.y) * 1.8;
      vZ = pos.z;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    uniform sampler2D uTex; uniform float uHasTex; uniform float uBend; uniform float uActive;
    varying vec2 vUv; varying float vZ;
    float roundRect(vec2 uv, float r){ vec2 q = abs(uv - 0.5) - (0.5 - r); return length(max(q, 0.0)) - r; }
    void main(){
      vec2 off = vec2(0.0012 * uBend, 0.0);
      vec3 tex;
      if (uHasTex > 0.5) { tex = vec3(texture2D(uTex, vUv + off).r, texture2D(uTex, vUv).g, texture2D(uTex, vUv - off).b); }
      else { tex = vec3(0.13); }
      float g = dot(tex, vec3(0.299, 0.587, 0.114));
      vec3 col = mix(vec3(g), tex, 0.3 + 0.7 * uActive);
      col *= 0.78 + 0.22 * uActive;
      col *= 1.0 + vZ * 0.35;
      float d = roundRect(vUv, 0.012);
      float alpha = 1.0 - smoothstep(-0.002, 0.0015, d);
      float border = smoothstep(-0.006, -0.003, d);
      col = mix(col, vec3(0.06), border * 0.35);
      gl_FragColor = vec4(col, alpha);
    }
  `;

  const cards = [];
  const baseY = new Array(4);
  let active = 0;
  let scroll = 0;
  let vw = 0, vh = 0, gap = 0, yOff = 0;

  const workTextures = textures.work || [];
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  for (let i = 0; i < 4; i++) {
    const tex = workTextures[i] || null;
    if (tex) {
      tex.minFilter = T.LinearMipmapLinearFilter;
      tex.magFilter = T.LinearFilter;
      tex.generateMipmaps = true;
      tex.anisotropy = maxAniso;
      tex.needsUpdate = true;
    }
    const material = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader,
      fragmentShader,
      uniforms: {
        uTex: { value: tex },
        uHasTex: { value: tex ? 1 : 0 },
        uBend: { value: 0 },
        uCurve: { value: 0.7 },   // world units: card edges sit ~0.35 behind the centre
        uActive: { value: 0 },
        uTime: { value: 0 }
      }
    });
    const mesh = new T.Mesh(geometry, material);
    deck.add(mesh);
    cards.push(mesh);
  }

  function layout() {
    const fov = THREE.MathUtils.degToRad(35);
    vh = 2 * 10 * Math.tan(fov / 2);
    vw = vh * camera.aspect;

    let cw, x, spacing;
    if (isMobile || camera.aspect < 0.9) {
      // phones: list sits at the top, caption at the bottom, the active card between them
      cw = vw * 0.84;
      x = 0;
      spacing = 2.6;
      yOff = -vh * 0.09;
    } else {
      cw = Math.min(vw * 0.5, vh * 0.62 * 1.6);
      x = vw * 0.09;
      spacing = 1.06;
      yOff = 0;
    }
    const ch = cw / 1.6;
    gap = ch * spacing;

    for (let i = 0; i < 4; i++) {
      cards[i].scale.set(cw, ch, 1);
      cards[i].position.x = x;
      baseY[i] = -i * gap;
    }
  }

  const raycaster = new T.Raycaster();
  const ndc = new T.Vector2();

  function pick(ndcX, ndcY) {
    ndc.set(ndcX, ndcY);
    raycaster.setFromCamera(ndc, camera);
    const intersects = raycaster.intersectObjects(cards, false);
    for (const hit of intersects) {
      if (hit.object.visible) {
        return cards.indexOf(hit.object);
      }
    }
    return -1;
  }

  function resize(w, h) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    layout();
  }

  function update(s) {
    const targetScroll = s.progress * 3 * gap;
    const kScroll = 1 - Math.pow(1 - 0.14, s.dt * 60);
    scroll += (targetScroll - scroll) * kScroll;

    for (let i = 0; i < 4; i++) {
      const mesh = cards[i];
      mesh.position.y = baseY[i] + scroll + yOff;
      mesh.visible = Math.abs(mesh.position.y) < vh;
    }

    active = Math.min(3, Math.max(0, Math.round(s.progress * 3)));

    const kActive = 1 - Math.pow(1 - 0.1, s.dt * 60);
    for (let i = 0; i < 4; i++) {
      const target = i === active ? 1 : 0;
      cards[i].material.uniforms.uActive.value += (target - cards[i].material.uniforms.uActive.value) * kActive;
    }

    const targetBend = THREE.MathUtils.clamp(s.velocity * 1.2, -1, 1);
    const kBend = 1 - Math.pow(1 - 0.1, s.dt * 60);
    for (let i = 0; i < 4; i++) {
      cards[i].material.uniforms.uBend.value += (targetBend - cards[i].material.uniforms.uBend.value) * kBend;
    }

    if (!reducedMotion) {
      const kRot = 1 - Math.pow(1 - 0.1, s.dt * 60);
      deck.rotation.y += (s.mouse.x * 0.07 - deck.rotation.y) * kRot;
      deck.rotation.x += (-s.mouse.y * 0.045 - deck.rotation.x) * kRot;
    } else {
      deck.rotation.y = 0;
      deck.rotation.x = 0;
    }

    for (let i = 0; i < 4; i++) {
      cards[i].material.uniforms.uTime.value = s.time;
    }
  }

  resize(width, height);

  return {
    scene,
    camera,
    update,
    resize,
    pick,
    get activeIndex() { return active; }
  };
}