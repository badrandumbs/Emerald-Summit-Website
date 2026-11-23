// Each discipline's 3D world: one sculpted object built from its palette, that
// assembles itself as `k` runs 0 → 1 and moves as `t` (seconds) runs. Pure
// three.js, no React; the engine (engine.ts) owns the renderer, camera and
// lights and calls update() before each frame it draws. Shared helpers are in
// kit.ts; each discipline's opening scene is in intros.ts.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  Bag,
  TAU,
  _c,
  _m,
  _v,
  blendFor,
  col,
  easeOutBack,
  easeOutCubic,
  glowPoints,
  glowSprite,
  mix,
  phase,
  rng,
  stagger,
  SNOISE_GLSL,
  type BuildCtx,
  type World,
  type WorldKind,
} from './kit';

export type { BuildCtx, World, WorldKind };
export { easeOutCubic };

// ── TechVerse: a server rack ────────────────────────────────────────────────
// A glass-sided rack of server blades on a circuit board: each blade's status
// lights blink and its activity meter moves, and pulses run out along the
// board's traces. (The processor chip that hovered above was removed on
// Nov 23, 2026.)
// The frame stands up first, then the blades slide in bottom to top.

function circuit(c: BuildCtx): World {
  const { vibe } = c;
  const bag = new Bag();
  const root = new THREE.Group();
  const W = 2.0;
  const D = 1.4;
  const H = 4.0;
  const metal = bag.add(
    new THREE.MeshStandardMaterial({
      color: c.light ? mix(vibe.surface, vibe.accent2, 0.12) : mix(vibe.surface, vibe.background, 0.1),
      roughness: 0.32,
      metalness: 0.85,
    }),
  );

  // Frame: four posts, top and bottom caps, glass sides and back.
  const frame = new THREE.Group();
  const post = bag.add(new THREE.BoxGeometry(0.1, H, 0.1));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const m = new THREE.Mesh(post, metal);
      m.position.set((sx * W) / 2, H / 2, (sz * D) / 2);
      frame.add(m);
    }
  }
  const capGeo = bag.add(new RoundedBoxGeometry(W + 0.2, 0.14, D + 0.2, 2, 0.03));
  const topCap = new THREE.Mesh(capGeo, metal);
  topCap.position.y = H + 0.07;
  const baseCap = new THREE.Mesh(capGeo, metal);
  baseCap.position.y = 0.07;
  frame.add(topCap, baseCap);
  const glassMat = bag.add(
    new THREE.MeshStandardMaterial({
      color: col(vibe.accent2),
      transparent: true,
      opacity: c.light ? 0.16 : 0.1,
      roughness: 0.08,
      metalness: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const sideGeo = bag.add(new THREE.PlaneGeometry(D, H));
  for (const sx of [-1, 1]) {
    const g = new THREE.Mesh(sideGeo, glassMat);
    g.rotation.y = Math.PI / 2;
    g.position.set((sx * W) / 2, H / 2, 0);
    frame.add(g);
  }
  const back = new THREE.Mesh(bag.add(new THREE.PlaneGeometry(W, H)), glassMat);
  back.position.set(0, H / 2, -D / 2);
  frame.add(back);
  root.add(frame);

  // Blades and their faces.
  const BLADES = 9;
  const BH = 0.36;
  const GAP = 0.05;
  const Y0 = 0.22;
  const FRONT = (D - 0.1) / 2 + 0.006;
  const bladeY = (b: number) => Y0 + b * (BH + GAP) + BH / 2;
  const blades = new THREE.InstancedMesh(
    bag.add(new RoundedBoxGeometry(W - 0.14, BH, D - 0.1, 2, 0.03)),
    bag.add(
      new THREE.MeshStandardMaterial({
        color: c.light ? mix(vibe.surface, vibe.accent2, 0.3) : mix(vibe.surface, vibe.accent2, 0.28),
        roughness: 0.3,
        metalness: 0.75,
      }),
    ),
    BLADES,
  );
  const VENTS = 12;
  const vents = new THREE.InstancedMesh(
    bag.add(new THREE.BoxGeometry(0.04, BH * 0.55, 0.012)),
    bag.add(new THREE.MeshBasicMaterial({ color: mix(vibe.background, '#000000', 0.3) })),
    BLADES * VENTS,
  );
  const LEDS = 5;
  const leds = new THREE.InstancedMesh(
    bag.add(new THREE.BoxGeometry(0.05, 0.05, 0.02)),
    bag.add(new THREE.MeshBasicMaterial({ color: 0xffffff })),
    BLADES * LEDS,
  );
  const barGeo = bag.add(new THREE.BoxGeometry(1, 0.03, 0.016));
  barGeo.translate(0.5, 0, 0);
  const bars = new THREE.InstancedMesh(
    barGeo,
    bag.add(new THREE.MeshBasicMaterial({ color: col(vibe.accent) })),
    BLADES,
  );
  for (const m of [blades, vents, leds, bars]) {
    m.frustumCulled = false;
    root.add(m);
  }
  const ledGlow = glowPoints(c, bag, BLADES * LEDS, 0.28);
  root.add(ledGlow.pts);
  const ledOn = [col(vibe.accent).multiplyScalar(c.light ? 1 : 1.5), col(vibe.accent2).multiplyScalar(c.light ? 1 : 1.4)];
  const ledOff = mix(vibe.background, vibe.surface, 0.5);
  const r = rng(7);
  const ledRate = Array.from({ length: BLADES * LEDS }, () => 1.5 + r() * 7);
  const ledTone = Array.from({ length: BLADES * LEDS }, () => (r() < 0.75 ? 0 : 1));
  const blink = (i: number, t: number) => {
    const x = Math.sin((i * 12.9898 + Math.floor(t * ledRate[i])) * 78.233) * 43758.5453;
    return x - Math.floor(x) > 0.4;
  };

  // The circuit board it stands on, with pulses running out along the traces.
  const plate = new THREE.Mesh(
    bag.add(new THREE.CylinderGeometry(2.4, 2.5, 0.08, 72)),
    bag.add(new THREE.MeshStandardMaterial({ color: mix(vibe.background, vibe.surface, 0.7), roughness: 0.6, metalness: 0.4 })),
  );
  plate.position.y = -0.04;
  root.add(plate);
  const TRACES = 22;
  const tracePaths: THREE.Vector3[][] = [];
  const traceLines: number[] = [];
  for (let i = 0; i < TRACES; i++) {
    const a = (i / TRACES) * TAU;
    const bend = a + (i % 2 ? 0.18 : -0.18);
    const p0 = new THREE.Vector3(Math.cos(a) * 1.25, 0.004, Math.sin(a) * 1.0);
    const p1 = new THREE.Vector3(Math.cos(a) * 1.75, 0.004, Math.sin(a) * 1.55);
    const p2 = new THREE.Vector3(Math.cos(bend) * 2.3, 0.004, Math.sin(bend) * 2.3);
    tracePaths.push([p0, p1, p2]);
    traceLines.push(...p0.toArray(), ...p1.toArray(), ...p1.toArray(), ...p2.toArray());
  }
  const traceGeo = bag.add(new THREE.BufferGeometry());
  traceGeo.setAttribute('position', new THREE.Float32BufferAttribute(traceLines, 3));
  root.add(
    new THREE.LineSegments(
      traceGeo,
      bag.add(new THREE.LineBasicMaterial({ color: col(vibe.accent), transparent: true, opacity: 0.3 })),
    ),
  );
  const pulses = glowPoints(c, bag, TRACES, 0.32);
  root.add(pulses.pts);
  const pulseSpeed = Array.from({ length: TRACES }, () => 0.3 + r() * 0.5);

  return {
    root,
    radius: 2.9,
    centerY: 2.05,
    elevation: 0.24,
    azimuth: 0.55,
    points: [ledGlow.mat, pulses.mat],
    update(t, k) {
      const fk = easeOutCubic(phase(k, 0, 0.3));
      frame.scale.y = Math.max(0.001, fk);
      glassMat.opacity = (c.light ? 0.16 : 0.1) * fk;
      const bk = phase(k, 0.15, 0.82);
      for (let b = 0; b < BLADES; b++) {
        const local = easeOutCubic(stagger(bk, b, BLADES, 0.4));
        const y = bladeY(b);
        const z = (1 - local) * 3.2;
        const s = local > 0 ? 1 : 0.001;
        _m.rotation.set(0, 0, 0);
        _m.scale.setScalar(s);
        _m.position.set(0, y, z);
        _m.updateMatrix();
        blades.setMatrixAt(b, _m.matrix);
        for (let j = 0; j < VENTS; j++) {
          _m.position.set(-0.84 + j * 0.065, y, z + FRONT);
          _m.updateMatrix();
          vents.setMatrixAt(b * VENTS + j, _m.matrix);
        }
        const lit = local > 0.97;
        for (let j = 0; j < LEDS; j++) {
          const i = b * LEDS + j;
          _m.position.set(0.42 + j * 0.09, y + 0.07, z + FRONT);
          _m.updateMatrix();
          leds.setMatrixAt(i, _m.matrix);
          const on = lit && blink(i, t);
          leds.setColorAt(i, on ? ledOn[ledTone[i]] : ledOff);
          ledGlow.pos[i * 3] = 0.42 + j * 0.09;
          ledGlow.pos[i * 3 + 1] = y + 0.07;
          ledGlow.pos[i * 3 + 2] = z + FRONT + 0.03;
          _c.copy(ledOn[ledTone[i]]).multiplyScalar(on ? 0.9 : 0);
          _c.toArray(ledGlow.colors, i * 3);
        }
        const activity = 0.12 + 0.4 * (0.5 + 0.5 * Math.sin(t * (1.3 + b * 0.37) + b) * Math.sin(t * 2.9 + b * 1.7));
        _m.position.set(0.38, y - 0.08, z + FRONT);
        _m.scale.set(lit ? activity : 0.001, 1, 1);
        _m.updateMatrix();
        bars.setMatrixAt(b, _m.matrix);
      }
      for (const m of [blades, vents, leds, bars]) m.instanceMatrix.needsUpdate = true;
      if (leds.instanceColor) leds.instanceColor.needsUpdate = true;
      ledGlow.geo.attributes.position.needsUpdate = true;
      ledGlow.geo.attributes.color.needsUpdate = true;

      for (let i = 0; i < TRACES; i++) {
        const [p0, p1, p2] = tracePaths[i];
        const u = (t * pulseSpeed[i] + i * 0.37) % 1;
        if (u < 0.5) _v.lerpVectors(p0, p1, u * 2);
        else _v.lerpVectors(p1, p2, (u - 0.5) * 2);
        _v.y = 0.03;
        _v.toArray(pulses.pos, i * 3);
        _c.set(vibe.accent).multiplyScalar(Math.sin(u * Math.PI) * fk);
        _c.toArray(pulses.colors, i * 3);
      }
      pulses.geo.attributes.position.needsUpdate = true;
      pulses.geo.attributes.color.needsUpdate = true;

      root.rotation.y = Math.sin(t * 0.22) * 0.38;
    },
    dispose: () => bag.dispose(),
  };
}

// ── VentureVerse: a business district ───────────────────────────────────────
// A downtown block at dusk: glass office towers with lit windows, a beacon on
// the tallest spire, a rooftop billboard cycling through what a new business
// shouts about (marketing), and traffic running along the streets. The towers
// rise from the street one after another.

/** A window grid on a canvas: `lit` draws only the lit panes (for the glow), otherwise the whole facade. */
function facadeTexture(lit: boolean): THREE.CanvasTexture {
  const w = 64;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = lit ? '#000000' : '#2A2C34';
  ctx.fillRect(0, 0, w, h);
  const r = rng(17);
  const COLS = 4;
  const ROWS = 8;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const on = r() < 0.55;
      const px = 3 + x * (w / COLS);
      const py = 3 + y * (h / ROWS);
      if (lit) {
        if (!on) continue;
        ctx.fillStyle = `rgba(255,255,255,${0.7 + r() * 0.3})`;
      } else {
        ctx.fillStyle = on ? '#E8E4DA' : '#14161C';
      }
      ctx.fillRect(px, py, w / COLS - 6, h / ROWS - 6);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const BILLBOARD = [
  ['GRAND OPENING', 'this Saturday'],
  ['NOW HIRING', 'join the team'],
  ['PITCH NIGHT', 'investors welcome'],
  ['LAUNCH DAY', 'v1.0 is live'],
];

function ticker(c: BuildCtx): World {
  const { vibe } = c;
  const bag = new Bag();
  const root = new THREE.Group();

  // Street level: a round block with roads crossing it.
  const ground = new THREE.Mesh(
    bag.add(new THREE.CylinderGeometry(2.7, 2.8, 0.1, 72)),
    bag.add(new THREE.MeshStandardMaterial({ color: mix(vibe.background, vibe.surface, 0.75), roughness: 0.85, metalness: 0.1 })),
  );
  ground.position.y = -0.05;
  root.add(ground);
  const LANES_Z = [-0.72, 0.48];
  const LANES_X = [-0.82, 0.42];
  const roadMat = bag.add(new THREE.MeshStandardMaterial({ color: col('#1C1D22'), roughness: 0.9 }));
  for (const z of LANES_Z) {
    const road = new THREE.Mesh(bag.add(new THREE.BoxGeometry(5.0, 0.012, 0.26)), roadMat);
    road.position.set(0, 0.006, z);
    root.add(road);
  }
  for (const x of LANES_X) {
    const road = new THREE.Mesh(bag.add(new THREE.BoxGeometry(0.26, 0.013, 5.0)), roadMat);
    road.position.set(x, 0.006, 0);
    root.add(road);
  }

  // Towers: x, z, width, depth, height.
  const specs: [number, number, number, number, number][] = [
    [-0.2, -0.15, 0.82, 0.78, 3.4],
    [-1.45, -0.15, 0.7, 0.66, 2.3],
    [1.05, -0.15, 0.72, 0.62, 2.7],
    [-0.2, 1.15, 0.7, 0.55, 1.55],
    [1.05, 1.15, 0.66, 0.55, 1.9],
    [-1.45, 1.15, 0.6, 0.55, 1.2],
    [-0.2, -1.45, 0.78, 0.55, 2.0],
    [1.05, -1.45, 0.6, 0.55, 1.45],
    [-1.45, -1.45, 0.62, 0.55, 1.05],
  ];
  const facade = bag.add(facadeTexture(false));
  const glowMap = bag.add(facadeTexture(true));
  const roofMat = bag.add(new THREE.MeshStandardMaterial({ color: col('#24262D'), roughness: 0.7, metalness: 0.3 }));
  const warm = mix('#FFD9A0', vibe.accent2, 0.25);
  const glass = c.light ? mix(vibe.surface, vibe.accent2, 0.35) : mix('#5E6B80', vibe.accent2, 0.15);
  const towerGeo = bag.add(new THREE.BoxGeometry(1, 1, 1));
  towerGeo.translate(0, 0.5, 0);
  const towers = specs.map(([x, z, w, d, h], i) => {
    const map = bag.add(facade.clone());
    const emissiveMap = bag.add(glowMap.clone());
    const rx = Math.max(1, Math.round(w * 3));
    const ry = Math.max(1, Math.round(h * 1.6));
    map.repeat.set(rx, ry);
    emissiveMap.repeat.set(rx, ry);
    map.offset.set(i * 0.25, i * 0.375);
    emissiveMap.offset.copy(map.offset);
    const side = bag.add(
      new THREE.MeshPhysicalMaterial({
        color: glass,
        map,
        emissive: warm,
        emissiveMap,
        emissiveIntensity: 0,
        roughness: 0.18,
        metalness: 0.55,
        clearcoat: 0.6,
      }),
    );
    const mesh = new THREE.Mesh(towerGeo, [side, side, roofMat, roofMat, side, side]);
    mesh.position.set(x, 0, z);
    mesh.scale.set(w, 0.001, d);
    root.add(mesh);
    return { mesh, side, h, d: Math.hypot(x, z) };
  });

  // The tallest tower's spire and beacon.
  const spire = new THREE.Group();
  const mast = new THREE.Mesh(bag.add(new THREE.CylinderGeometry(0.015, 0.04, 0.7, 8)), roofMat);
  mast.position.y = 0.35;
  const beacon = glowSprite(c, bag, col('#FF4D4D'), 0.5, 1);
  beacon.position.y = 0.72;
  spire.add(mast, beacon);
  root.add(spire);

  // A billboard on the third tower's roof, facing the street.
  const BW = 512;
  const BH = 224;
  const boardCanvas = document.createElement('canvas');
  boardCanvas.width = BW;
  boardCanvas.height = BH;
  const boardCtx = boardCanvas.getContext('2d')!;
  const boardTex = bag.add(new THREE.CanvasTexture(boardCanvas));
  boardTex.colorSpace = THREE.SRGBColorSpace;
  let shown = -1;
  const drawBoard = (n: number) => {
    if (n === shown) return;
    shown = n;
    const [title, sub] = BILLBOARD[n];
    const g = boardCtx.createLinearGradient(0, 0, BW, BH);
    g.addColorStop(0, vibe.accent);
    g.addColorStop(1, mix(vibe.accent, '#000000', 0.45).getStyle());
    boardCtx.fillStyle = g;
    boardCtx.fillRect(0, 0, BW, BH);
    boardCtx.textAlign = 'center';
    // Shrink each line until it fits inside the board with a margin.
    const fit = (text: string, weight: string, size: number, y: number, color: string) => {
      let px = size;
      boardCtx.font = `${weight} ${px}px "Helvetica Neue", Arial, sans-serif`;
      while (px > 12 && boardCtx.measureText(text).width > BW - 56) {
        px -= 2;
        boardCtx.font = `${weight} ${px}px "Helvetica Neue", Arial, sans-serif`;
      }
      boardCtx.fillStyle = color;
      boardCtx.fillText(text, BW / 2, y);
    };
    fit(title, 'bold', 64, 108, '#FFFFFF');
    fit(sub, 'normal', 38, 170, 'rgba(255,255,255,0.85)');
    boardTex.needsUpdate = true;
  };
  const board = new THREE.Group();
  const panel = new THREE.Mesh(
    bag.add(new THREE.PlaneGeometry(1.1, 0.48)),
    bag.add(new THREE.MeshBasicMaterial({ map: boardTex, toneMapped: false })),
  );
  panel.position.y = 0.42;
  panel.position.z = 0.02;
  const backing = new THREE.Mesh(bag.add(new THREE.BoxGeometry(1.16, 0.54, 0.03)), roofMat);
  backing.position.y = 0.42;
  const legGeo = bag.add(new THREE.BoxGeometry(0.03, 0.2, 0.03));
  for (const x of [-0.4, 0.4]) {
    const leg = new THREE.Mesh(legGeo, roofMat);
    leg.position.set(x, 0.1, -0.02);
    board.add(leg);
  }
  board.add(backing, panel, glowSprite(c, bag, col(vibe.accent), 1.6, 0.25));
  board.children[board.children.length - 1].position.set(0, 0.42, 0.1);
  board.rotation.y = 0.5;
  root.add(board);

  // Traffic: headlights one way, tail lights the other, along every road.
  const CARS = 36;
  const cars = glowPoints(c, bag, CARS, 0.13);
  root.add(cars.pts);
  const r = rng(11);
  const carSeeds = Array.from({ length: CARS }, (_, i) => {
    const alongX = i % 2 === 0;
    const lanes = alongX ? LANES_Z : LANES_X;
    const dir = r() < 0.5 ? 1 : -1;
    return { alongX, lane: lanes[Math.floor(r() * lanes.length)] + dir * 0.06, dir, speed: 0.25 + r() * 0.3, off: r() };
  });
  const head = col('#FFF4D6');
  const tail = col('#FF4A3D');

  return {
    root,
    radius: 2.8,
    centerY: 1.3,
    elevation: 0.42,
    azimuth: 0.5,
    points: [cars.mat],
    update(t, k) {
      towers.forEach((tw, i) => {
        const local = easeOutCubic(stagger(k, i, towers.length, 0.45));
        tw.mesh.scale.y = Math.max(0.001, tw.h * local);
        // Windows come on as each tower tops out, with a slow office flicker.
        tw.side.emissiveIntensity = (c.light ? 0.6 : 1.4) * phase(local, 0.7, 1) * (0.92 + 0.08 * Math.sin(t * 0.7 + i * 1.9));
      });
      const top = towers[0];
      spire.position.set(top.mesh.position.x, top.mesh.scale.y, top.mesh.position.z);
      spire.visible = k > 0.5;
      (beacon.material as THREE.SpriteMaterial).opacity = (Math.sin(t * 3) > 0.2 ? 1 : 0.15) * (c.light ? 0.6 : 1);
      const host = towers[2];
      board.position.set(host.mesh.position.x, host.mesh.scale.y, host.mesh.position.z);
      board.visible = k > 0.6;
      drawBoard(Math.floor(t / 2.6) % BILLBOARD.length);

      const on = phase(k, 0.5, 1);
      for (let i = 0; i < CARS; i++) {
        const s = carSeeds[i];
        const u = ((t * s.speed * s.dir + s.off) % 1 + 1) % 1;
        const p = -2.4 + u * 4.8;
        if (s.alongX) cars.pos.set([p, 0.05, s.lane], i * 3);
        else cars.pos.set([s.lane, 0.05, p], i * 3);
        _c.copy(s.dir > 0 ? head : tail).multiplyScalar(on);
        _c.toArray(cars.colors, i * 3);
      }
      cars.geo.attributes.position.needsUpdate = true;
      cars.geo.attributes.color.needsUpdate = true;
      root.rotation.y = Math.sin(t * 0.15) * 0.2;
    },
    dispose: () => bag.dispose(),
  };
}

// ── BioSphere: a double helix among falling leaves ──────────────────────────
// Base pairs fly in from all around and zip into a turning helix, bottom to
// top, while leaves drift and flutter down around it: life at the scale of a
// molecule and of a forest. (The brain is only in BioSphere's opening scene,
// intros.ts.)

/** A leaf drawn once on a canvas: soft shading, a midrib, side veins, speckle. Grey, so each leaf tints it. */
function leafTexture(): THREE.CanvasTexture {
  const w = 128;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const outline = () => {
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.985);
    ctx.bezierCurveTo(w * 0.0, h * 0.72, w * 0.06, h * 0.22, w / 2, h * 0.015);
    ctx.bezierCurveTo(w * 0.94, h * 0.22, w * 1.0, h * 0.72, w / 2, h * 0.985);
    ctx.closePath();
  };
  outline();
  const g = ctx.createRadialGradient(w * 0.42, h * 0.45, 4, w / 2, h / 2, h * 0.55);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.6, '#d9d9d9');
  g.addColorStop(1, '#8c8c8c');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  outline();
  ctx.clip();
  const r = rng(91);
  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`;
    ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(w / 2, h * 0.985);
  ctx.lineTo(w / 2, h * 0.06);
  ctx.stroke();
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  for (let i = 1; i <= 9; i++) {
    const y = h * (0.9 - i * 0.086);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(w / 2, y);
      ctx.quadraticCurveTo(w / 2 + side * w * 0.2, y - h * 0.03, w / 2 + side * w * 0.42, y - h * 0.11);
      ctx.stroke();
    }
  }
  const edge = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.55);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function cells(c: BuildCtx): World {
  const { vibe } = c;
  const bag = new Bag();
  const root = new THREE.Group();
  const helix = new THREE.Group();
  helix.rotation.z = 0.38;
  root.add(helix);
  const N = 26;
  const SPAN = 5.4;
  const R = 1.05;

  const nucMat = bag.add(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.15 }));
  const nuc = new THREE.InstancedMesh(bag.add(new THREE.SphereGeometry(0.17, 20, 14)), nucMat, N * 2);
  const beads = new THREE.InstancedMesh(bag.add(new THREE.SphereGeometry(0.07, 12, 8)), nucMat, (N - 1) * 2);
  const rungGeo = bag.add(new THREE.CylinderGeometry(0.04, 0.04, 1, 8));
  rungGeo.rotateZ(Math.PI / 2);
  const rungs = new THREE.InstancedMesh(rungGeo, nucMat, N * 2);
  for (const m of [nuc, beads, rungs]) {
    m.frustumCulled = false;
    helix.add(m);
  }
  const ca = col(vibe.accent);
  const cb = col(vibe.accent2);
  const ra = mix(vibe.accent, vibe.highlight, 0.25);
  const rb = mix(vibe.accent2, vibe.highlight, 0.25);
  for (let i = 0; i < N; i++) {
    nuc.setColorAt(i * 2, ca);
    nuc.setColorAt(i * 2 + 1, cb);
    rungs.setColorAt(i * 2, ra);
    rungs.setColorAt(i * 2 + 1, rb);
  }
  for (let i = 0; i < (N - 1) * 2; i++) beads.setColorAt(i, i % 2 ? cb : ca);

  const r = rng(23);
  const scatter = Array.from({ length: N }, () =>
    new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(3 + r() * 3),
  );

  // Leaves: a cupped, curling blade with the drawn leaf on it, in real leaf
  // greens (and a few turning gold) pulled a little toward the palette.
  const leafGeo = bag.add(new THREE.PlaneGeometry(0.42, 0.84, 4, 10));
  const lp = leafGeo.attributes.position;
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i) / 0.21;
    const y = lp.getY(i) / 0.42;
    lp.setZ(i, -0.05 * x * x + 0.09 * y * y + 0.03 * y);
  }
  leafGeo.computeVertexNormals();
  const LEAVES = 30;
  const leaves = new THREE.InstancedMesh(
    leafGeo,
    bag.add(
      new THREE.MeshStandardMaterial({
        map: bag.add(leafTexture()),
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        roughness: 0.6,
        metalness: 0,
      }),
    ),
    LEAVES,
  );
  leaves.frustumCulled = false;
  root.add(leaves);
  const greens = ['#5E8C2F', '#7BA33A', '#9CB84B', '#4C7829', '#6F9440', '#C49A3E'];
  const leafSeeds = Array.from({ length: LEAVES }, (_, i) => {
    leaves.setColorAt(i, mix(greens[i % greens.length], vibe.accent, 0.22));
    const front = r() < 0.25;
    const side = r() < 0.5 ? -1 : 1;
    return {
      x: front ? side * (2.6 + r() * 2.4) : (r() - 0.5) * 11,
      z: front ? 0.6 + r() * 1.0 : -0.6 - r() * 2.2,
      fall: 0.12 + r() * 0.16,
      phase: r(),
      sway: 0.4 + r() * 0.6,
      spin: (r() - 0.5) * 1.2,
      tilt: r() * TAU,
      size: 1.25 + r() * 0.8,
    };
  });

  const A = new THREE.Vector3();
  const B = new THREE.Vector3();
  const P = new THREE.Vector3();
  return {
    root,
    radius: 3.1,
    centerY: 0,
    elevation: 0.12,
    azimuth: 0,
    points: [],
    update(t, k) {
      const spin = t * 0.55;
      for (let i = 0; i < N; i++) {
        const local = easeOutCubic(stagger(k, i, N, 0.4));
        const y = -SPAN / 2 + (i * SPAN) / (N - 1);
        const a = i * 0.45 + spin;
        A.set(Math.cos(a) * R, y, Math.sin(a) * R);
        B.set(-A.x, y, -A.z);
        const s = Math.max(0.001, local);
        const fly = 1 - local;
        P.copy(A).addScaledVector(scatter[i], fly);
        _m.position.copy(P);
        _m.rotation.set(0, 0, 0);
        _m.scale.setScalar(s);
        _m.updateMatrix();
        nuc.setMatrixAt(i * 2, _m.matrix);
        P.copy(B).addScaledVector(scatter[i], -fly);
        _m.position.copy(P);
        _m.updateMatrix();
        nuc.setMatrixAt(i * 2 + 1, _m.matrix);

        // Each half-rung grows from its strand to the axis once the pair lands.
        const rl = Math.max(0.001, phase(local, 0.55, 1));
        for (const [side, end] of [[0, A], [1, B]] as const) {
          _m.position.copy(end).multiplyScalar(1 - rl / 2);
          _m.position.y = end.y;
          _m.rotation.set(0, -(a + side * Math.PI), 0);
          _m.scale.set(R * rl, 1, 1);
          _m.updateMatrix();
          rungs.setMatrixAt(i * 2 + side, _m.matrix);
        }
      }
      for (let i = 0; i < N - 1; i++) {
        const local = Math.min(stagger(k, i, N, 0.4), stagger(k, i + 1, N, 0.4));
        const y = -SPAN / 2 + ((i + 0.5) * SPAN) / (N - 1);
        const a = (i + 0.5) * 0.45 + spin;
        _m.rotation.set(0, 0, 0);
        _m.scale.setScalar(Math.max(0.001, easeOutCubic(local)));
        _m.position.set(Math.cos(a) * R, y, Math.sin(a) * R);
        _m.updateMatrix();
        beads.setMatrixAt(i * 2, _m.matrix);
        _m.position.set(-Math.cos(a) * R, y, -Math.sin(a) * R);
        _m.updateMatrix();
        beads.setMatrixAt(i * 2 + 1, _m.matrix);
      }
      nuc.instanceMatrix.needsUpdate = true;
      beads.instanceMatrix.needsUpdate = true;
      rungs.instanceMatrix.needsUpdate = true;

      const lk = easeOutCubic(phase(k, 0.1, 0.9));
      for (let i = 0; i < LEAVES; i++) {
        const s = leafSeeds[i];
        const u = (t * s.fall * 0.25 + s.phase) % 1;
        _m.position.set(s.x + Math.sin(t * s.sway + s.phase * 9) * 0.7, 4.6 - u * 9.2, s.z);
        _m.rotation.set(
          Math.sin(t * 1.1 * s.sway + s.phase * 7) * 0.7 + 0.4,
          s.tilt + t * s.spin,
          Math.sin(t * 0.8 + s.phase * 5) * 0.9,
        );
        _m.scale.setScalar(Math.max(0.001, s.size * lk));
        _m.updateMatrix();
        leaves.setMatrixAt(i, _m.matrix);
      }
      leaves.instanceMatrix.needsUpdate = true;
    },
    dispose: () => bag.dispose(),
  };
}

// ── NovaSphere: an Earth inside an atom ─────────────────────────────────────
// Core sciences and the climate: a living Earth (oceans, continents, ice caps,
// drifting clouds, a glowing atmosphere) at the nucleus of an atom whose
// electrons race around it, with a far field of stars and shooting stars
// streaking across behind.

const FRESNEL_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const FRESNEL_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.6);
    gl_FragColor = vec4(uColor, f * uOpacity);
    #include <colorspace_fragment>
  }
`;
const CLOUD_VERT = /* glsl */ `
  varying vec3 vObj;
  varying vec3 vN;
  void main() {
    vObj = position;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const CLOUD_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying vec3 vObj;
  varying vec3 vN;
  ${'__SNOISE__'}
  void main() {
    vec3 p = normalize(vObj) * 2.3 + vec3(uTime * 0.015, 0.0, uTime * 0.01);
    float n = snoise(p) * 0.6 + snoise(p * 2.1) * 0.3 + snoise(p * 4.3) * 0.12;
    float a = smoothstep(0.22, 0.7, n) * uOpacity;
    float light = clamp(dot(normalize(vN), normalize(vec3(0.5, 0.7, 0.6))), 0.0, 1.0) * 0.75 + 0.35;
    gl_FragColor = vec4(vec3(light), a);
    #include <colorspace_fragment>
  }
`;

function stars(c: BuildCtx): World {
  const { vibe } = c;
  const bag = new Bag();
  const root = new THREE.Group();
  const r = rng(31);

  // Earth: land and sea from noise in the fragment shader, so coastlines stay sharp up close.
  const earthMat = bag.add(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0.02 }));
  // Real Earth colors, nudged only slightly toward the palette.
  const ocean = mix('#0A3A66', vibe.flowColors[2] ?? vibe.accent, 0.08);
  const land = mix('#3B6B2C', vibe.accent, 0.12);
  const high = col('#7E6B43');
  earthMat.onBeforeCompile = (shader) => {
    shader.uniforms.uOcean = { value: ocean };
    shader.uniforms.uLand = { value: land };
    shader.uniforms.uHigh = { value: high };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\nvarying vec3 vObj;\nuniform vec3 uOcean;\nuniform vec3 uLand;\nuniform vec3 uHigh;\n${SNOISE_GLSL}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 sp = normalize(vObj);
        float h = snoise(sp * 1.5) * 0.65 + snoise(sp * 3.1 + 7.0) * 0.25 + snoise(sp * 7.0 + 3.0) * 0.1;
        float landMask = smoothstep(0.16, 0.2, h);
        vec3 ground = mix(uLand, uHigh, smoothstep(0.38, 0.62, h));
        vec3 sea = mix(uOcean * 0.6, uOcean * 1.25, smoothstep(-0.4, 0.18, h));
        vec3 surface = mix(sea, ground, landMask);
        float ice = smoothstep(0.78, 0.86, abs(sp.y) + snoise(sp * 4.0) * 0.04);
        diffuseColor.rgb = mix(surface, vec3(0.94, 0.97, 1.0), ice);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(0.32, 0.85, landMask);`,
      );
  };
  earthMat.customProgramCacheKey = () => 'emerald-earth';
  const earth = new THREE.Mesh(bag.add(new THREE.SphereGeometry(1.2, 96, 64)), earthMat);
  earth.rotation.z = 0.41; // Earth's tilt.
  const cloudUniforms = { uTime: { value: 0 }, uOpacity: { value: 0.7 } };
  const clouds = new THREE.Mesh(
    bag.add(new THREE.SphereGeometry(1.235, 72, 48)),
    bag.add(
      new THREE.ShaderMaterial({
        vertexShader: CLOUD_VERT,
        fragmentShader: CLOUD_FRAG.replace("__SNOISE__", SNOISE_GLSL),
        uniforms: cloudUniforms,
        transparent: true,
        depthWrite: false,
      }),
    ),
  );
  clouds.rotation.z = 0.41;
  const rim = new THREE.Mesh(
    bag.add(new THREE.SphereGeometry(1.34, 48, 32)),
    bag.add(
      new THREE.ShaderMaterial({
        vertexShader: FRESNEL_VERT,
        fragmentShader: FRESNEL_FRAG,
        uniforms: { uColor: { value: mix('#6FB8FF', vibe.accent, 0.15) }, uOpacity: { value: c.light ? 0.6 : 0.85 } },
        transparent: true,
        depthWrite: false,
        blending: blendFor(c),
      }),
    ),
  );
  const planet = new THREE.Group();
  planet.add(earth, clouds, rim);
  root.add(planet);

  // The atom: three orbits at 60° to each other, each with an electron.
  const orbitGeo = bag.add(new THREE.TorusGeometry(2.35, 0.014, 8, 220));
  const orbitMat = bag.add(
    new THREE.MeshBasicMaterial({ color: col(vibe.accent), transparent: true, opacity: c.light ? 0.6 : 0.45 }),
  );
  const electronGeo = bag.add(new THREE.SphereGeometry(0.09, 20, 14));
  const electronMat = bag.add(new THREE.MeshBasicMaterial({ color: col(vibe.accent).multiplyScalar(c.light ? 1 : 1.4) }));
  const orbits = [0, 1, 2].map((i) => {
    // Each orbit is a circle tipped 70° and turned a third of the way round
    // the view axis, so from the front they read as the atom symbol.
    const tilt = new THREE.Group();
    tilt.rotation.order = 'ZXY';
    tilt.rotation.set(1.22, 0, (i * TAU) / 3);
    const ring = new THREE.Mesh(orbitGeo, orbitMat);
    const electron = new THREE.Group();
    electron.add(new THREE.Mesh(electronGeo, electronMat), glowSprite(c, bag, col(vibe.accent), 0.9, 0.9));
    tilt.add(ring, electron);
    root.add(tilt);
    return { tilt, ring, electron, speed: 0.9 + i * 0.25, phase: i * 2.1 };
  });

  // Shooting stars: a bright head with a fading tail, crossing the sky behind.
  const streakTex = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.85, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(250, 3);
    ctx.arc(250, 8, 5, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(0, 8);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return bag.add(tex);
  })();
  const streakGeo = bag.add(new THREE.PlaneGeometry(1, 0.06));
  const streaks = [0, 1, 2].map((i) => {
    const m = new THREE.Mesh(
      streakGeo,
      bag.add(
        new THREE.MeshBasicMaterial({
          map: streakTex,
          color: c.light ? col(vibe.accent) : col(vibe.highlight),
          transparent: true,
          depthWrite: false,
          blending: blendFor(c),
          fog: false,
        }),
      ),
    );
    root.add(m);
    return { m, period: 3.4 + i * 1.3, offset: i * 1.7 };
  });
  const hash = (n: number) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  // Far stars.
  const FAR = 420;
  const sky = glowPoints(c, bag, FAR, 0.16, 0.9);
  for (let i = 0; i < FAR; i++) {
    _v.set(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(9 + r() * 7);
    _v.toArray(sky.pos, i * 3);
    _c.set(r() < 0.85 ? vibe.highlight : vibe.accent).multiplyScalar(0.4 + r() * 0.6);
    _c.toArray(sky.colors, i * 3);
  }
  root.add(sky.pts);

  return {
    root,
    radius: 2.6,
    centerY: 0,
    elevation: 0.22,
    azimuth: 0.15,
    points: [sky.mat],
    update(t, k) {
      const pk = phase(k, 0, 0.6);
      planet.scale.setScalar(Math.max(0.001, easeOutBack(pk)));
      earth.rotation.y = t * 0.12 + (1 - pk) * 1.5;
      clouds.rotation.y = t * 0.15 + (1 - pk) * 1.5;
      cloudUniforms.uTime.value = t;
      orbits.forEach((o, i) => {
        const ok = easeOutCubic(phase(k, 0.3 + i * 0.12, 0.75 + i * 0.08));
        o.tilt.visible = ok > 0;
        o.tilt.scale.setScalar(Math.max(0.001, ok));
        const a = t * o.speed + o.phase;
        o.electron.position.set(Math.cos(a) * 2.35, Math.sin(a) * 2.35, 0);
      });
      sky.mat.opacity = 0.9 * k;
      sky.pts.rotation.y = t * 0.01;
      streaks.forEach((s, i) => {
        const cyc = (t + s.offset) / s.period;
        const n = Math.floor(cyc);
        const u = (cyc - n) * s.period; // seconds into this cycle
        const RUN = 0.9;
        s.m.visible = u < RUN && k > 0.9;
        if (!s.m.visible) return;
        const p = u / RUN;
        const sx = -6 + hash(n + i * 17) * 8;
        const sy = 1.5 + hash(n * 3 + i * 5) * 3;
        const ang = -0.35 - hash(n * 7 + i) * 0.35;
        const dist = 5 + hash(n * 11 + i) * 3;
        const len = 1.6 + p * 1.2;
        const hx = sx + Math.cos(ang) * dist * p;
        const hy = sy + Math.sin(ang) * dist * p;
        s.m.position.set(hx - (Math.cos(ang) * len) / 2, hy - (Math.sin(ang) * len) / 2, -6);
        s.m.rotation.z = ang;
        s.m.scale.set(len, 1, 1);
        (s.m.material as THREE.MeshBasicMaterial).opacity = Math.sin(p * Math.PI);
      });
    },
    dispose: () => bag.dispose(),
  };
}

// ── CivicVerse: a round temple ──────────────────────────────────────────────
// A three-step podium, a colonnade that rises column by column, then the
// entablature and dome settle on top. A light burns inside, and rings spread
// over the floor like a gavel's strike.

function ripples(c: BuildCtx): World {
  const { vibe } = c;
  const bag = new Bag();
  const root = new THREE.Group();
  const marble = c.light ? mix(vibe.surface, vibe.accent2, 0.18) : col(vibe.accent);
  const stoneMat = bag.add(new THREE.MeshStandardMaterial({ color: marble, roughness: 0.55, metalness: 0.05 }));

  const podium = new THREE.Group();
  [2.5, 2.28, 2.06].forEach((rad, i) => {
    const step = new THREE.Mesh(bag.add(new THREE.CylinderGeometry(rad, rad, 0.16, 72)), stoneMat);
    step.position.y = 0.08 + i * 0.16;
    podium.add(step);
  });
  root.add(podium);
  const FLOOR = 0.48;

  const profile = [
    [0.001, 0],
    [0.25, 0],
    [0.25, 0.08],
    [0.18, 0.15],
    [0.16, 0.3],
    [0.145, 2.1],
    [0.19, 2.22],
    [0.25, 2.3],
    [0.25, 2.4],
    [0.001, 2.4],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const COLS = 12;
  const RING = 1.72;
  const columns = new THREE.InstancedMesh(bag.add(new THREE.LatheGeometry(profile, 20)), stoneMat, COLS);
  columns.frustumCulled = false;
  root.add(columns);
  const TOP = FLOOR + 2.4;

  const ringShape = (outer: number, inner: number) => {
    const s = new THREE.Shape().absarc(0, 0, outer, 0, TAU, false);
    s.holes.push(new THREE.Path().absarc(0, 0, inner, 0, TAU, true));
    return s;
  };
  const beamGeo = bag.add(new THREE.ExtrudeGeometry(ringShape(2.05, 1.42), { depth: 0.24, bevelEnabled: false, curveSegments: 64 }));
  beamGeo.rotateX(-Math.PI / 2);
  const corniceGeo = bag.add(new THREE.ExtrudeGeometry(ringShape(2.16, 1.36), { depth: 0.07, bevelEnabled: false, curveSegments: 64 }));
  corniceGeo.rotateX(-Math.PI / 2);
  const beam = new THREE.Group();
  const cornice = new THREE.Mesh(corniceGeo, stoneMat);
  cornice.position.y = 0.24;
  beam.add(new THREE.Mesh(beamGeo, stoneMat), cornice);
  root.add(beam);

  const domeMat = bag.add(
    new THREE.MeshStandardMaterial({
      color: mix(vibe.accent2, vibe.accent, c.light ? 0.1 : 0.22),
      roughness: 0.3,
      metalness: 0.45,
    }),
  );
  const dome = new THREE.Group();
  const shell = new THREE.Mesh(bag.add(new THREE.SphereGeometry(1.72, 56, 20, 0, TAU, 0, Math.PI / 2)), domeMat);
  shell.scale.y = 0.78;
  const finial = new THREE.Mesh(bag.add(new THREE.SphereGeometry(0.1, 16, 12)), bag.add(new THREE.MeshBasicMaterial({ color: col(vibe.accent) })));
  finial.position.y = 1.72 * 0.78 + 0.1;
  dome.add(shell, finial, glowSprite(c, bag, col(vibe.accent), 0.9, 0.8));
  dome.children[2].position.y = finial.position.y;
  root.add(dome);

  // The light inside.
  const flame = new THREE.Group();
  flame.position.y = FLOOR + 1.1;
  const lamp = new THREE.PointLight(col(vibe.accent), c.light ? 4 : 9, 7, 1.6);
  flame.add(
    new THREE.Mesh(bag.add(new THREE.SphereGeometry(0.26, 24, 16)), bag.add(new THREE.MeshBasicMaterial({ color: col(vibe.accent) }))),
    glowSprite(c, bag, col(vibe.accent), 2.6, 0.9),
    lamp,
  );
  root.add(flame);

  const rippleGeo = bag.add(new THREE.RingGeometry(0.965, 1, 120));
  rippleGeo.rotateX(-Math.PI / 2);
  const ripples_ = [0, 1, 2].map((i) => {
    const m = new THREE.Mesh(
      rippleGeo,
      bag.add(
        new THREE.MeshBasicMaterial({
          color: col(i % 2 ? vibe.accent2 : vibe.accent),
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      ),
    );
    m.position.y = 0.005;
    root.add(m);
    return m;
  });

  return {
    root,
    radius: 3.2,
    centerY: 2.0,
    elevation: 0.3,
    azimuth: 0,
    points: [],
    update(t, k) {
      podium.scale.y = Math.max(0.001, easeOutCubic(phase(k, 0, 0.3)));
      const ck = phase(k, 0.15, 0.75);
      for (let i = 0; i < COLS; i++) {
        const local = easeOutCubic(stagger(ck, i, COLS, 0.35));
        const a = (i / COLS) * TAU;
        _m.position.set(Math.cos(a) * RING, FLOOR * podium.scale.y, Math.sin(a) * RING);
        _m.rotation.set(0, 0, 0);
        _m.scale.set(1, Math.max(0.001, local), 1);
        _m.updateMatrix();
        columns.setMatrixAt(i, _m.matrix);
      }
      columns.instanceMatrix.needsUpdate = true;
      const bk = phase(k, 0.55, 0.85);
      beam.visible = bk > 0;
      beam.position.y = TOP + (1 - easeOutBack(bk)) * 2.6;
      const dk = phase(k, 0.68, 1);
      dome.visible = dk > 0;
      dome.position.y = TOP + 0.31 + (1 - easeOutBack(dk)) * 3.2;
      const fk = easeOutCubic(phase(k, 0.4, 1));
      flame.scale.setScalar(Math.max(0.001, fk * (1 + 0.05 * Math.sin(t * 2.2))));
      lamp.intensity = (c.light ? 4 : 9) * fk;
      ripples_.forEach((m, i) => {
        const p = (t / 3.6 + i / 3) % 1;
        m.scale.setScalar(2.6 + p * 5);
        (m.material as THREE.MeshBasicMaterial).opacity = (1 - p) ** 2 * 0.5 * fk;
      });
      root.rotation.y = t * 0.06;
    },
    dispose: () => bag.dispose(),
  };
}

// ── ImagineX: a grand piano playing itself ──────────────────────────────────
// A lacquered grand with its lid propped open, gold plate and strings inside,
// music on the desk and a bench in front. The keys play a looping chord
// progression on their own (left hand roots, right hand arpeggios), notes
// float up from the keys, and soft patches of colored light drift and change
// hue behind it, like the old paint motif.

/** A music-note glyph on a canvas, white so each sprite tints it. */
function noteTexture(glyph: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.font = `${size * 0.8}px "Segoe UI Symbol", "Apple Symbols", "Noto Music", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, size / 2, size / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** One loop of the self-playing piano: which white key (0 = lowest C) at what time. */
function pianoScore(): { at: number; key: number; right: boolean }[] {
  // C, Am, F, G in C major, as scale degrees (0 = C).
  const chords = [
    [0, 2, 4],
    [5, 7, 9],
    [3, 5, 7],
    [4, 6, 8],
  ];
  const events: { at: number; key: number; right: boolean }[] = [];
  const BAR = 2;
  chords.forEach((chord, b) => {
    const t0 = b * BAR;
    // Left hand: the root, then the fifth, low on the keyboard.
    events.push({ at: t0, key: 7 + chord[0], right: false });
    events.push({ at: t0 + 1, key: 7 + chord[0] + 4, right: false });
    // Right hand: an arpeggio up and back down, an octave and a half higher.
    const up = [chord[0], chord[1], chord[2], chord[0] + 7, chord[1] + 7, chord[2] + 7, chord[0] + 7, chord[2]];
    up.forEach((deg, i) => events.push({ at: t0 + i * 0.25, key: 14 + deg, right: true }));
  });
  return events;
}

function paint(c: BuildCtx): World {
  const { vibe } = c;
  const bag = new Bag();
  const root = new THREE.Group();
  const piano = new THREE.Group();
  piano.position.set(-0.78, 0, 0.75);
  root.add(piano);

  const lacquer = bag.add(
    new THREE.MeshPhysicalMaterial({
      color: mix('#0C0A10', vibe.accent2, 0.05),
      roughness: 0.22,
      metalness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
    }),
  );
  const brass = bag.add(new THREE.MeshStandardMaterial({ color: col('#C9A55A'), roughness: 0.3, metalness: 0.85 }));

  // The case, seen from above: straight bass side on the left, the treble
  // side curving in to the rounded tail.
  const outline = () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(1.55, 0);
    s.lineTo(1.55, 0.5);
    s.bezierCurveTo(1.55, 1.1, 0.78, 1.2, 0.64, 1.8);
    s.bezierCurveTo(0.54, 2.3, 0.46, 2.6, 0.2, 2.62);
    s.bezierCurveTo(0.05, 2.62, 0, 2.5, 0, 2.3);
    s.lineTo(0, 0);
    return s;
  };
  const LEG = 0.75;
  const CASE = 0.36;
  const caseGeo = bag.add(new THREE.ExtrudeGeometry(outline(), { depth: CASE, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 48 }));
  caseGeo.rotateX(-Math.PI / 2);
  const body = new THREE.Mesh(caseGeo, lacquer);
  body.position.y = LEG;
  // Gold plate and strings inside, under the open lid.
  const plateGeo = bag.add(new THREE.ExtrudeGeometry(outline(), { depth: 0.02, bevelEnabled: false, curveSegments: 48 }));
  plateGeo.rotateX(-Math.PI / 2);
  const plate = new THREE.Mesh(plateGeo, brass);
  plate.scale.set(0.93, 1, 0.95);
  plate.position.set(0.055, LEG + CASE - 0.05, -0.06);
  const strings: number[] = [];
  for (let i = 0; i < 44; i++) {
    const x = 0.12 + (i / 43) * 1.33;
    const len = 2.4 - 1.3 * (x / 1.55) ** 1.25;
    strings.push(x, LEG + CASE - 0.02, -0.12, x, LEG + CASE - 0.02, -0.12 - len);
  }
  const stringGeo = bag.add(new THREE.BufferGeometry());
  stringGeo.setAttribute('position', new THREE.Float32BufferAttribute(strings, 3));
  const stringLines = new THREE.LineSegments(
    stringGeo,
    bag.add(new THREE.LineBasicMaterial({ color: col('#E8D9B0'), transparent: true, opacity: 0.7 })),
  );

  // Lid, hinged along the bass side and propped open on the treble side.
  const lidGeo = bag.add(new THREE.ExtrudeGeometry(outline(), { depth: 0.03, bevelEnabled: false, curveSegments: 48 }));
  lidGeo.rotateX(-Math.PI / 2);
  const lid = new THREE.Group();
  lid.position.y = LEG + CASE + 0.012;
  lid.add(new THREE.Mesh(lidGeo, lacquer));
  const LID_OPEN = 0.55;
  const stick = new THREE.Mesh(bag.add(new THREE.CylinderGeometry(0.012, 0.012, 1, 8)), lacquer);

  // Legs, pedals, keybed, keys, fallboard, music desk, bench.
  const legGeo = bag.add(new THREE.CylinderGeometry(0.07, 0.045, LEG, 16));
  const legs = [
    [0.12, -0.08],
    [1.43, -0.08],
    [0.32, -2.25],
  ].map(([x, z]) => {
    const m = new THREE.Mesh(legGeo, lacquer);
    m.position.set(x, LEG / 2, z);
    return m;
  });
  const lyre = new THREE.Mesh(bag.add(new THREE.BoxGeometry(0.22, 0.6, 0.06)), lacquer);
  lyre.position.set(0.78, 0.38, -0.25);
  const pedalGeo = bag.add(new THREE.BoxGeometry(0.04, 0.02, 0.14));
  const pedals = [-0.07, 0, 0.07].map((dx) => {
    const m = new THREE.Mesh(pedalGeo, brass);
    m.position.set(0.78 + dx, 0.08, -0.17);
    return m;
  });

  const keybed = new THREE.Mesh(bag.add(new THREE.BoxGeometry(1.55, 0.1, 0.56)), lacquer);
  keybed.position.set(0.775, LEG + 0.05, 0.28);
  const WHITES = 30;
  const KX0 = 0.05;
  const KW = 1.45 / WHITES;
  const KEY_Y = LEG + 0.115;
  const whiteKeys = new THREE.InstancedMesh(
    bag.add(new THREE.BoxGeometry(KW * 0.92, 0.03, 0.42)),
    bag.add(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 })),
    WHITES,
  );
  const blackSlots: number[] = [];
  for (let i = 0; i < WHITES - 1; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) blackSlots.push(i);
  const blackKeys = new THREE.InstancedMesh(
    bag.add(new THREE.BoxGeometry(KW * 0.56, 0.04, 0.26)),
    bag.add(new THREE.MeshStandardMaterial({ color: col('#121016'), roughness: 0.3 })),
    blackSlots.length,
  );
  blackSlots.forEach((slot, i) => {
    _m.position.set(KX0 + (slot + 1) * KW, KEY_Y + 0.03, 0.17);
    _m.rotation.set(0, 0, 0);
    _m.scale.setScalar(1);
    _m.updateMatrix();
    blackKeys.setMatrixAt(i, _m.matrix);
  });
  for (const m of [whiteKeys, blackKeys]) m.frustumCulled = false;
  const fall = new THREE.Mesh(bag.add(new THREE.BoxGeometry(1.5, 0.14, 0.03)), lacquer);
  fall.position.set(0.775, LEG + 0.17, 0.02);
  const desk = new THREE.Group();
  desk.add(new THREE.Mesh(bag.add(new THREE.BoxGeometry(0.85, 0.3, 0.02)), lacquer));
  const sheet = new THREE.Mesh(
    bag.add(new THREE.PlaneGeometry(0.62, 0.26)),
    bag.add(new THREE.MeshStandardMaterial({ color: col('#F4EFE3'), roughness: 0.9 })),
  );
  sheet.position.z = 0.012;
  desk.add(sheet);
  desk.position.set(0.775, LEG + CASE + 0.16, -0.12);
  desk.rotation.x = -0.32;

  const bench = new THREE.Group();
  const seat = new THREE.Mesh(bag.add(new RoundedBoxGeometry(0.9, 0.08, 0.36, 2, 0.02)), lacquer);
  seat.position.y = 0.5;
  bench.add(seat);
  const benchLeg = bag.add(new THREE.BoxGeometry(0.05, 0.46, 0.05));
  for (const [x, z] of [[-0.4, -0.14], [0.4, -0.14], [-0.4, 0.14], [0.4, 0.14]]) {
    const m = new THREE.Mesh(benchLeg, lacquer);
    m.position.set(x, 0.23, z);
    bench.add(m);
  }
  bench.position.set(0.775, 0, 1.0);

  piano.add(body, plate, stringLines, lid, stick, ...legs, lyre, ...pedals, keybed, whiteKeys, blackKeys, fall, desk, bench);

  // The score and the notes it sends up.
  const score = pianoScore();
  const LOOP = 8;
  const press = new Float32Array(WHITES);
  const keyTint = mix('#FFFFFF', vibe.accent, 0.55);
  const white = new THREE.Color(0xffffff);
  const glyphs = [bag.add(noteTexture('♪')), bag.add(noteTexture('♫'))];
  const NOTES = 20;
  const notes = Array.from({ length: NOTES }, (_, i) => {
    const m = bag.add(
      new THREE.SpriteMaterial({ map: glyphs[i % 2], color: col(vibe.flowColors[i % vibe.flowColors.length]), transparent: true, depthWrite: false }),
    );
    const s = new THREE.Sprite(m);
    s.scale.setScalar(0.22);
    piano.add(s);
    return s;
  });

  // Soft light patches behind, drifting and slowly trading colors.
  const AZ = 0.62;
  const behind = new THREE.Vector3(-Math.sin(AZ), 0, -Math.cos(AZ)).multiplyScalar(3.4);
  const across = new THREE.Vector3(Math.cos(AZ), 0, -Math.sin(AZ));
  const r = rng(47);
  const patches = Array.from({ length: 6 }, (_, i) => {
    const s = glowSprite(c, bag, col(vibe.flowColors[i % vibe.flowColors.length]), 1, c.light ? 0.5 : 0.32);
    root.add(s);
    return { s, ax: r() * TAU, ay: r() * TAU, sx: 0.12 + r() * 0.1, sy: 0.1 + r() * 0.1, size: 4.5 + r() * 3.5 };
  });
  const palette = vibe.flowColors.map(col);

  return {
    root,
    radius: 2.15,
    centerY: 0.95,
    elevation: 0.42,
    azimuth: AZ,
    points: [],
    update(t, k) {
      const bk = phase(k, 0, 0.55);
      piano.scale.setScalar(Math.max(0.001, easeOutBack(bk)));
      lid.rotation.z = LID_OPEN * easeOutCubic(phase(k, 0.35, 0.85));
      // The prop stick reaches from the case to the lid's underside.
      const reach = 1.3;
      const lx = reach * Math.cos(lid.rotation.z);
      const ly = reach * Math.sin(lid.rotation.z);
      stick.visible = ly > 0.05;
      stick.scale.y = Math.max(0.001, ly);
      stick.position.set(lx, LEG + CASE + ly / 2, -1.0);

      // Keys: a glissando up the keyboard as it arrives, then the score.
      const playing = phase(k, 0.85, 1) > 0;
      const loopT = t % LOOP;
      press.fill(0);
      const gk = phase(k, 0.6, 0.95);
      if (gk > 0 && gk < 1) {
        const at = gk * WHITES;
        for (let i = 0; i < WHITES; i++) press[i] = Math.max(0, 1 - Math.abs(at - i) / 1.5);
      }
      if (playing) {
        for (const e of score) {
          let age = loopT - e.at;
          if (age < 0) age += LOOP;
          if (age < 0.6 && e.key < WHITES) press[e.key] = Math.max(press[e.key], Math.exp(-age * 6));
        }
      }
      for (let i = 0; i < WHITES; i++) {
        _m.position.set(KX0 + (i + 0.5) * KW, KEY_Y - 0.012 * press[i], 0.3);
        _m.rotation.set(0.05 * press[i], 0, 0);
        _m.scale.setScalar(1);
        _m.updateMatrix();
        whiteKeys.setMatrixAt(i, _m.matrix);
        whiteKeys.setColorAt(i, _c.lerpColors(white, keyTint, press[i] * 0.8));
      }
      whiteKeys.instanceMatrix.needsUpdate = true;
      if (whiteKeys.instanceColor) whiteKeys.instanceColor.needsUpdate = true;

      // Each right-hand note sends a note glyph floating up for 2.4 seconds.
      let n = 0;
      if (playing) {
        for (const e of score) {
          if (!e.right || n >= NOTES) continue;
          let age = loopT - e.at;
          if (age < 0) age += LOOP;
          if (age > 2.4) continue;
          const s = notes[n++];
          const u = age / 2.4;
          s.visible = true;
          s.position.set(KX0 + (e.key + 0.5) * KW + Math.sin(age * 2 + e.key) * 0.12, KEY_Y + 0.25 + u * 1.5, 0.05 - u * 0.4);
          (s.material as THREE.SpriteMaterial).opacity = Math.sin(Math.min(1, u * 4) * Math.PI * 0.5) * (1 - u);
        }
      }
      for (; n < NOTES; n++) notes[n].visible = false;

      const pk = easeOutCubic(phase(k, 0.1, 0.8));
      patches.forEach((p, i) => {
        p.s.position.copy(behind).addScaledVector(across, Math.sin(t * p.sx + p.ax) * 3.2);
        p.s.position.y = 1 + Math.sin(t * p.sy + p.ay) * 1.8;
        p.s.scale.setScalar(p.size * (0.85 + 0.15 * Math.sin(t * 0.5 + i)) * pk);
        const f = (t * 0.06 + i * 0.9) % palette.length;
        const i0 = Math.floor(f);
        (p.s.material as THREE.SpriteMaterial).color.lerpColors(palette[i0], palette[(i0 + 1) % palette.length], f - i0);
      });
      root.rotation.y = Math.sin(t * 0.15) * 0.25;
    },
    dispose: () => bag.dispose(),
  };
}

// ── New disciplines: an emerald ─────────────────────────────────────────────

function gem(c: BuildCtx): World {
  const { vibe } = c;
  const bag = new Bag();
  const root = new THREE.Group();
  const profile = [
    [0.001, -1.75],
    [1.2, 0.1],
    [1.25, 0.25],
    [0.95, 0.65],
    [0.001, 0.65],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const stone = new THREE.Mesh(
    bag.add(new THREE.LatheGeometry(profile, 8)),
    bag.add(
      new THREE.MeshPhysicalMaterial({
        color: col(vibe.accent),
        roughness: 0.06,
        metalness: 0.15,
        clearcoat: 1,
        flatShading: true,
        emissive: col(vibe.accent),
        emissiveIntensity: c.light ? 0.05 : 0.15,
      }),
    ),
  );
  stone.position.y = 0.3;
  const halo = glowSprite(c, bag, col(vibe.accent), 4.5, 0.45);
  root.add(halo, stone);

  const SHARDS = 30;
  const r = rng(53);
  const shards = new THREE.InstancedMesh(
    bag.add(new THREE.TetrahedronGeometry(0.14)),
    bag.add(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.4, flatShading: true })),
    SHARDS,
  );
  shards.frustumCulled = false;
  const seeds = Array.from({ length: SHARDS }, (_, i) => {
    shards.setColorAt(i, col(vibe.flowColors[i % vibe.flowColors.length]));
    return { rad: 2.1 + r() * 0.9, a: r() * TAU, y: (r() - 0.5) * 2.2, spin: r() * TAU, speed: 0.12 + r() * 0.2 };
  });
  root.add(shards);

  return {
    root,
    radius: 3.0,
    centerY: 0,
    elevation: 0.2,
    azimuth: 0,
    points: [],
    update(t, k) {
      const gk = phase(k, 0, 0.7);
      stone.scale.setScalar(Math.max(0.001, easeOutBack(gk)));
      stone.rotation.y = t * 0.35 + (1 - gk) * 3;
      stone.position.y = 0.3 + Math.sin(t * 1.1) * 0.08;
      halo.scale.setScalar(4.5 * gk);
      for (let i = 0; i < SHARDS; i++) {
        const s = seeds[i];
        const local = easeOutCubic(stagger(k, i, SHARDS, 0.5));
        const a = s.a + t * s.speed;
        const rad = s.rad * (1 + (1 - local) * 2);
        _m.position.set(Math.cos(a) * rad, s.y, Math.sin(a) * rad);
        _m.rotation.set(s.spin + t, s.spin * 2 + t * 0.7, 0);
        _m.scale.setScalar(Math.max(0.001, local));
        _m.updateMatrix();
        shards.setMatrixAt(i, _m.matrix);
      }
      shards.instanceMatrix.needsUpdate = true;
    },
    dispose: () => bag.dispose(),
  };
}

const BUILDERS: Record<WorldKind, (c: BuildCtx) => World> = { circuit, ticker, cells, stars, ripples, paint, gem };

export function buildWorld(kind: WorldKind, ctx: BuildCtx): World {
  return BUILDERS[kind](ctx);
}
