// Shared pieces for the discipline worlds (worlds.ts) and their opening scenes
// (intros.ts): types, easing, seeded randomness, glows, the noise and brain
// shaders, and the brain model BioSphere uses in both.
import * as THREE from 'three';
import type { VerseVibe } from '../../../models/verseVibes';

export type WorldKind = 'circuit' | 'ticker' | 'cells' | 'stars' | 'ripples' | 'paint' | 'gem';

export interface BuildCtx {
  vibe: VerseVibe;
  /** Light theme: pale background, so glows blend normally instead of adding. */
  light: boolean;
  /** Soft round sprite shared by every glow. */
  glow: THREE.Texture;
}

export interface World {
  root: THREE.Object3D;
  /** Bounding radius around `centerY`, for fitting the camera. */
  radius: number;
  centerY: number;
  /** Camera height angle and turn, in radians. */
  elevation: number;
  azimuth: number;
  /** Point materials whose `userData.base` size the engine rescales per view. */
  points: THREE.PointsMaterial[];
  /** false: the camera doesn't swing in with k (intros run their own timeline on it). */
  swoop?: boolean;
  /** Camera distance multiplier, read each frame (intros push in or pull back). */
  dolly?: number;
  /** Camera shake in world units, read each frame (a gavel strike). */
  shake?: number;
  update(t: number, k: number): void;
  dispose(): void;
}

// ── Small helpers ───────────────────────────────────────────────────────────

export const TAU = Math.PI * 2;
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
export const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
export const easeOutBack = (x: number) => {
  const c1 = 1.4;
  return 1 + (c1 + 1) * (x - 1) ** 3 + c1 * (x - 1) ** 2;
};
/** Item i of n's own 0..1 inside the overall k; each item takes `span` of it. */
export const stagger = (k: number, i: number, n: number, span: number) =>
  clamp01((k - (n <= 1 ? 0 : i / (n - 1)) * (1 - span)) / span);
/** k remapped so the part runs between `from` and `to` of the timeline. */
export const phase = (k: number, from: number, to: number) => clamp01((k - from) / (to - from));

/** Seeded random, so a world looks the same every time it opens. */
export function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const col = (hex: string) => new THREE.Color(hex);
export const mix = (a: string, b: string, t: number) => new THREE.Color().lerpColors(col(a), col(b), t);

export class Bag {
  private items: { dispose(): void }[] = [];
  add<T extends { dispose(): void }>(x: T): T {
    this.items.push(x);
    return x;
  }
  dispose() {
    for (const x of this.items) x.dispose();
    this.items = [];
  }
}

export const blendFor = (c: BuildCtx) => (c.light ? THREE.NormalBlending : THREE.AdditiveBlending);

export function glowSprite(c: BuildCtx, bag: Bag, color: THREE.Color | string, scale: number, opacity = 1) {
  const m = bag.add(
    new THREE.SpriteMaterial({
      map: c.glow,
      color,
      transparent: true,
      depthWrite: false,
      blending: blendFor(c),
      opacity: c.light ? opacity * 0.55 : opacity,
      fog: false,
    }),
  );
  const s = new THREE.Sprite(m);
  s.scale.setScalar(scale);
  return s;
}

export function glowPoints(c: BuildCtx, bag: Bag, count: number, size: number, opacity = 1) {
  const geo = bag.add(new THREE.BufferGeometry());
  const pos = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = bag.add(
    new THREE.PointsMaterial({
      size,
      map: c.glow,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: blendFor(c),
      opacity: c.light ? opacity * 0.8 : opacity,
      sizeAttenuation: true,
    }),
  );
  mat.userData.base = size;
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return { pts, pos, colors, geo, mat };
}

export const _m = new THREE.Object3D();
export const _c = new THREE.Color();
export const _v = new THREE.Vector3();

/** Simplex noise (Ashima Arts / Stefan Gustavson, MIT), shared by the shaders here. */
export const SNOISE_GLSL = /* glsl */ `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }
`;

/**
 * The cerebrum's surface for a direction `d` on the unit sphere (+z is the
 * front, +y the top). `fold` comes back 0 deep in a sulcus, 1 on a gyrus.
 */
export const BRAIN_GLSL = /* glsl */ `
  ${SNOISE_GLSL}
  vec3 cerebrum(vec3 d, out float fold) {
    // Overall proportions: long front to back, wider than tall, flatter underneath.
    vec3 q = d * vec3(0.95, 0.8, 1.22);
    if (q.y < -0.15) q.y = -0.15 + (q.y + 0.15) * 0.5;
    // Temporal lobes swell out low on each side, toward the front.
    float temporal = exp(-pow((d.y + 0.35) / 0.28, 2.0)) * smoothstep(-0.6, 0.3, d.z);
    q.x *= 1.0 + 0.14 * temporal;
    // The frontal lobe is a little narrower, the occipital a little rounder.
    q.x *= 1.0 - 0.06 * smoothstep(0.3, 1.0, d.z);
    // Longitudinal fissure: the deep groove between the hemispheres, over the top and down the back.
    float fis = exp(-pow(d.x / 0.07, 2.0)) * smoothstep(-0.45, 0.15, d.y + 0.25 * step(d.z, 0.0));
    // Sylvian fissure: the lateral groove above the temporal lobe.
    float sylv = exp(-pow((d.y - (-0.12 + 0.32 * d.z)) / 0.045, 2.0)) * smoothstep(0.5, 0.8, abs(d.x)) * smoothstep(-0.5, 0.2, d.z);
    // Gyri and sulci: the grooves are where warped noise crosses zero.
    vec3 w = d * 1.7 + vec3(snoise(d * 1.4), snoise(d * 1.4 + 11.3), snoise(d * 1.4 + 27.1)) * 0.55;
    float g = abs(snoise(w * 1.55));
    fold = smoothstep(0.0, 0.26, g);
    float r = 1.0 - 0.14 * fis - 0.05 * sylv;
    r *= 1.0 + (fold - 1.0) * 0.065 * (1.0 - fis);
    fold = min(fold, 1.0 - 0.8 * max(fis, sylv));
    return q * r;
  }
`;


/**
 * A brain shaped like one: two hemispheres split by the longitudinal fissure,
 * folded gyri with darkened sulci (BRAIN_GLSL), temporal lobes, a finely
 * ridged cerebellum and the brain stem, with sparks of thought racing over
 * it. Front is +z. `update(t, sparks)` moves the sparks; `sparks` 0..1 fades them.
 */
export function brainModel(c: BuildCtx, bag: Bag, seed = 47) {
  const { vibe } = c;
  const group = new THREE.Group();
  const tissue = mix('#E9BDBA', vibe.accent, 0.18);
  const cortexMat = bag.add(
    new THREE.MeshPhysicalMaterial({
      color: tissue,
      roughness: 0.42,
      metalness: 0,
      clearcoat: 0.35,
      clearcoatRoughness: 0.4,
      sheen: 0.6,
      sheenColor: new THREE.Color('#FFD9D6'),
      sheenRoughness: 0.5,
    }),
  );
  cortexMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying float vFold;\n${BRAIN_GLSL}`)
      .replace(
        '#include <beginnormal_vertex>',
        `vec3 bD = normalize(position);
        vec3 bT = normalize(cross(bD, abs(bD.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
        vec3 bB = cross(bD, bT);
        float bFold;
        float bUnused;
        vec3 bP = cerebrum(bD, bFold);
        vec3 bPT = cerebrum(normalize(bD + bT * 0.006), bUnused);
        vec3 bPB = cerebrum(normalize(bD + bB * 0.006), bUnused);
        vFold = bFold;
        vec3 objectNormal = normalize(cross(bPT - bP, bPB - bP));
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif`,
      )
      .replace('#include <begin_vertex>', 'vec3 transformed = bP;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vFold;')
      .replace('#include <color_fragment>', `#include <color_fragment>\n        diffuseColor.rgb *= mix(0.42, 1.0, vFold);`);
  };
  cortexMat.customProgramCacheKey = () => 'emerald-cerebrum';
  const cortex = new THREE.Mesh(bag.add(new THREE.SphereGeometry(1, 220, 160)), cortexMat);
  cortex.frustumCulled = false;

  const cbGeo = bag.add(new THREE.SphereGeometry(1, 96, 64));
  const cp = cbGeo.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    _v.fromBufferAttribute(cp, i).normalize();
    const ridge = 0.5 + 0.5 * Math.sin(_v.y * 46 + Math.sin(_v.x * 3) * 1.5);
    const split = Math.exp(-((_v.x / 0.12) ** 2)) * 0.12;
    _v.multiplyScalar(1 + ridge * 0.035 - split);
    cp.setXYZ(i, _v.x, _v.y, _v.z);
  }
  cbGeo.computeVertexNormals();
  const sheen = new THREE.Color('#FFD9D6');
  const cerebellum = new THREE.Mesh(
    cbGeo,
    bag.add(new THREE.MeshPhysicalMaterial({ color: tissue.clone().multiplyScalar(0.82), roughness: 0.45, sheen: 0.5, sheenColor: sheen })),
  );
  cerebellum.scale.set(0.6, 0.34, 0.42);
  cerebellum.position.set(0, -0.5, -0.82);
  const stem = new THREE.Mesh(
    bag.add(new THREE.CylinderGeometry(0.17, 0.12, 0.9, 32)),
    bag.add(new THREE.MeshPhysicalMaterial({ color: tissue.clone().multiplyScalar(0.9), roughness: 0.5, sheen: 0.4, sheenColor: sheen })),
  );
  stem.position.set(0, -0.78, -0.42);
  stem.rotation.x = 0.35;
  group.add(stem, cerebellum, cortex);

  const SPARKS = 26;
  const sparks = glowPoints(c, bag, SPARKS, 0.3);
  group.add(sparks.pts);
  const r = rng(seed);
  const seeds = Array.from({ length: SPARKS }, () => {
    const axis = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
    const start = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
    start.sub(axis.clone().multiplyScalar(start.dot(axis))).normalize();
    return { axis, start, speed: 0.6 + r() * 0.9, phase: r() * TAU, tone: Math.floor(r() * 3) };
  });
  const tones = vibe.flowColors.map((h) => col(h).multiplyScalar(c.light ? 0.9 : 1.6));
  const shell = new THREE.Vector3(0.98, 0.84, 1.26);

  return {
    group,
    sparksMaterial: sparks.mat,
    update(t: number, on: number) {
      for (let i = 0; i < SPARKS; i++) {
        const s = seeds[i];
        _v.copy(s.start).applyAxisAngle(s.axis, t * s.speed + s.phase);
        _v.multiply(shell).multiplyScalar(1.03);
        _v.toArray(sparks.pos, i * 3);
        _c.copy(tones[s.tone % tones.length]).multiplyScalar((0.55 + 0.45 * Math.sin(t * 5 + s.phase * 3)) * on);
        _c.toArray(sparks.colors, i * 3);
      }
      sparks.geo.attributes.position.needsUpdate = true;
      sparks.geo.attributes.color.needsUpdate = true;
    },
  };
}
