// Each discipline's opening scene, played over the blurred discipline page
// when it opens (DisciplineIntro.tsx), like the Summit '27 intro. `k` runs
// 0 → 1 once over INTRO_MS (2 seconds since Nov 23, 2026; it was 3); `t` keeps running so the scene stays alive while
// it blurs away into the page. Drawn on a transparent background.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  Bag,
  TAU,
  _c,
  _m,
  _v,
  brainModel,
  clamp01,
  col,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  glowPoints,
  glowSprite,
  phase,
  rng,
  type BuildCtx,
  type World,
  type WorldKind,
} from './kit';

/** How long an opening scene plays before it blurs into the page. */
export const INTRO_MS = 2000;
const SECONDS = INTRO_MS / 1000;
const easeInCubic = (x: number) => x * x * x;

/** A soft dark spot under an object, so it sits on something. */
function shadow(c: BuildCtx, bag: Bag, size: number) {
  const m = new THREE.Mesh(
    bag.add(new THREE.PlaneGeometry(size, size)),
    bag.add(new THREE.MeshBasicMaterial({ map: c.glow, color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false })),
  );
  m.rotation.x = -Math.PI / 2;
  return m;
}

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, ctx, canvas };
}

// ── TechVerse: a computer writing code ──────────────────────────────────────
// A monitor rises and turns to face you, its screen switches on like an old
// tube, and code types itself out and scrolls while the camera leans in.

const CODE = [
  "import { Summit } from '@emerald/summit';",
  '',
  "const techverse = new Discipline('TechVerse');",
  'for (const track of techverse.tracks) {',
  '  await track.open({ seats: track.capacity });',
  '  console.log(`${track.name} is ready`);',
  '}',
  '',
  'function build(idea: Idea): Prototype {',
  '  const model = train(idea.data, { epochs: 12 });',
  "  return deploy(model, { to: 'robot' });",
  '}',
  '',
  "robot.on('sensor', (d) => robot.move(d.x, d.y));",
  'cad.extrude(sketch, 24).fillet(2);',
  '// build passed: 0 errors, 128 tests',
];
const KEYWORDS = new Set(['import', 'from', 'const', 'new', 'for', 'of', 'await', 'function', 'return', 'if', 'let', 'async']);

function computer(c: BuildCtx): World {
  const bag = new Bag();
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  const shell = bag.add(new THREE.MeshStandardMaterial({ color: col('#1A1F2B'), roughness: 0.35, metalness: 0.7 }));

  const SW = 1024;
  const SH = 600;
  const screen = canvasTexture(SW, SH, () => {});
  bag.add(screen.tex);
  const total = CODE.reduce((n, l) => n + l.length + 1, 0);
  const drawScreen = (chars: number, t: number) => {
    const ctx = screen.ctx;
    ctx.fillStyle = '#0A1020';
    ctx.fillRect(0, 0, SW, SH);
    ctx.fillStyle = '#121B30';
    ctx.fillRect(0, 0, SW, 44);
    ['#FF5F57', '#FEBC2E', '#28C840'].forEach((dot, i) => {
      ctx.fillStyle = dot;
      ctx.beginPath();
      ctx.arc(26 + i * 26, 22, 8, 0, TAU);
      ctx.fill();
    });
    ctx.fillStyle = '#8A97B5';
    ctx.font = '20px ui-monospace, Menlo, Consolas, monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText('techverse.ts', 120, 23);
    ctx.font = '26px ui-monospace, Menlo, Consolas, monospace';
    ctx.textBaseline = 'top';
    const LH = 34;
    const maxLines = Math.floor((SH - 64) / LH);
    const shown: string[] = [];
    let left = chars;
    for (const line of CODE) {
      if (left <= 0) break;
      shown.push(line.slice(0, Math.min(line.length, left)));
      left -= line.length + 1;
    }
    const start = Math.max(0, shown.length - maxLines);
    let cursorX = 84;
    let cursorY = 60;
    for (let i = start; i < shown.length; i++) {
      const y = 60 + (i - start) * LH;
      ctx.fillStyle = '#3B4763';
      ctx.fillText(String(i + 1).padStart(2, ' '), 20, y);
      let x = 84;
      const tokens = shown[i].match(/(\s+|\/\/.*|'[^']*'?|`[^`]*`?|[A-Za-z_]\w*|\d+|.)/g) ?? [];
      tokens.forEach((tok, ti) => {
        let color = '#D6DEEB';
        if (tok.startsWith('//')) color = '#5C6B8A';
        else if (tok[0] === "'" || tok[0] === '`') color = '#80DED9';
        else if (KEYWORDS.has(tok)) color = '#C792EA';
        else if (/^\d/.test(tok)) color = '#F78C6C';
        else if (/^[A-Za-z_]/.test(tok) && tokens[ti + 1] === '(') color = '#82AAFF';
        ctx.fillStyle = color;
        ctx.fillText(tok, x, y);
        x += ctx.measureText(tok).width;
      });
      cursorX = x;
      cursorY = y;
    }
    if (Math.sin(t * 9) > 0 || chars < total) {
      ctx.fillStyle = '#80DED9';
      ctx.fillRect(cursorX + 2, cursorY + 2, 14, 28);
    }
    screen.tex.needsUpdate = true;
  };

  // Monitor: bezel, screen, neck and foot.
  const monitor = new THREE.Group();
  monitor.add(new THREE.Mesh(bag.add(new RoundedBoxGeometry(3.3, 2.05, 0.12, 3, 0.05)), shell));
  const screenMat = bag.add(new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false }));
  const screenMesh = new THREE.Mesh(bag.add(new THREE.PlaneGeometry(3.1, 1.82)), screenMat);
  screenMesh.position.z = 0.065;
  monitor.add(screenMesh);
  const glow = glowSprite(c, bag, col('#80DED9'), 5, 0.35);
  glow.position.z = 0.4;
  monitor.add(glow);
  monitor.position.y = 1.75;
  const neck = new THREE.Mesh(bag.add(new THREE.BoxGeometry(0.22, 0.75, 0.12)), shell);
  neck.position.set(0, 0.5, -0.12);
  const foot = new THREE.Mesh(bag.add(new RoundedBoxGeometry(1.2, 0.06, 0.6, 2, 0.02)), shell);
  foot.position.set(0, 0.11, -0.05);
  rig.add(monitor, neck, foot);

  // Keyboard in front.
  const board = new THREE.Mesh(bag.add(new RoundedBoxGeometry(2.4, 0.07, 0.75, 2, 0.02)), shell);
  board.position.set(0, 0.1, 1.05);
  const KEYS_X = 14;
  const KEYS_Z = 4;
  const keys = new THREE.InstancedMesh(
    bag.add(new RoundedBoxGeometry(0.135, 0.04, 0.13, 1, 0.01)),
    bag.add(new THREE.MeshStandardMaterial({ color: col('#2A3142'), roughness: 0.5 })),
    KEYS_X * KEYS_Z,
  );
  keys.frustumCulled = false;
  rig.add(board, keys);
  const r = rng(5);
  const keyRate = Array.from({ length: KEYS_X * KEYS_Z }, () => 4 + r() * 10);
  const lit = col('#80DED9');
  const dark = col('#2A3142');
  const floorShadow = shadow(c, bag, 5);
  floorShadow.position.y = 0.06;
  root.add(floorShadow);

  const w: World = {
    root,
    radius: 1.95,
    centerY: 1.35,
    elevation: 0.12,
    azimuth: 0,
    points: [],
    swoop: false,
    update(t, k) {
      const rk = easeOutBack(phase(k, 0, 0.28));
      rig.position.y = (1 - rk) * -3;
      rig.rotation.y = (1 - easeOutCubic(phase(k, 0, 0.3))) * -0.8;
      floorShadow.scale.setScalar(Math.max(0.001, rk));
      // Tube switch-on: a bright line opens to the full screen.
      const on = phase(k, 0.25, 0.33);
      screenMesh.scale.set(1, Math.max(0.01, easeOutCubic(on)), 1);
      screenMat.color.setScalar(1 + (1 - on) * 2);
      glow.visible = on > 0;
      const chars = Math.floor(easeInOutCubic(phase(k, 0.33, 0.95)) * total);
      drawScreen(on > 0 ? chars : 0, t);
      const typing = k > 0.33 && k < 0.95;
      for (let i = 0; i < KEYS_X * KEYS_Z; i++) {
        const row = Math.floor(i / KEYS_X);
        const colI = i % KEYS_X;
        const down = typing && Math.sin(t * keyRate[i] + i) > 0.92;
        _m.position.set(-0.95 + colI * 0.146, 0.15 - (down ? 0.015 : 0), 0.82 + row * 0.15);
        _m.rotation.set(0, 0, 0);
        _m.scale.setScalar(1);
        _m.updateMatrix();
        keys.setMatrixAt(i, _m.matrix);
        keys.setColorAt(i, down ? lit : dark);
      }
      keys.instanceMatrix.needsUpdate = true;
      if (keys.instanceColor) keys.instanceColor.needsUpdate = true;
      w.dolly = 1.15 - 0.3 * easeInOutCubic(phase(k, 0.3, 1));
    },
    dispose: () => bag.dispose(),
  };
  return w;
}

// ── VentureVerse: a bag of money ────────────────────────────────────────────
// A burlap money bag drops in and lands with a squash, rumbles and swells as
// it fills past bursting, then explodes in a flash: scraps of burlap fly,
// bills burst out and flutter down, and coins rain onto the ground.

function moneyBag(c: BuildCtx): World {
  const { vibe } = c;
  const bag = new Bag();
  const root = new THREE.Group();

  const profile = [
    [0.001, 0],
    [0.5, 0.03],
    [0.92, 0.28],
    [1.08, 0.7],
    [1.03, 1.1],
    [0.8, 1.45],
    [0.44, 1.7],
    [0.31, 1.8],
    [0.36, 1.88],
    [0.52, 2.02],
    [0.6, 2.12],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const sackGeo = bag.add(new THREE.LatheGeometry(profile, 64));
  // Cloth folds: ripple the surface a little.
  const sp = sackGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i);
    const y = sp.getY(i);
    const z = sp.getZ(i);
    const a = Math.atan2(z, x);
    const f = 1 + 0.035 * Math.sin(a * 9 + y * 3) * Math.sin(y * 2.2) + 0.02 * Math.sin(a * 17 - y * 5);
    sp.setXYZ(i, x * f, y, z * f);
  }
  sackGeo.computeVertexNormals();
  const burlap = bag.add(new THREE.MeshStandardMaterial({ color: col('#B8935F'), roughness: 0.95, side: THREE.DoubleSide }));
  const sack = new THREE.Group();
  sack.add(new THREE.Mesh(sackGeo, burlap));
  const rope = new THREE.Mesh(
    bag.add(new THREE.TorusGeometry(0.34, 0.055, 12, 48)),
    bag.add(new THREE.MeshStandardMaterial({ color: col('#6E4A26'), roughness: 0.9 })),
  );
  rope.rotation.x = Math.PI / 2;
  rope.position.y = 1.82;
  const emblem = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#2F5A34';
    ctx.beginPath();
    ctx.arc(128, 128, 112, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#E8D9A8';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.fillStyle = '#E8D9A8';
    ctx.font = 'bold 170px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 128, 138);
  });
  bag.add(emblem.tex);
  const sign = new THREE.Mesh(
    bag.add(new THREE.PlaneGeometry(0.85, 0.85)),
    bag.add(new THREE.MeshStandardMaterial({ map: emblem.tex, transparent: true, roughness: 0.8 })),
  );
  sign.position.set(0, 0.82, 1.1);
  sack.add(rope, sign);
  root.add(sack);
  const ground = shadow(c, bag, 4.5);
  ground.position.y = 0.01;
  root.add(ground);

  // The burst: a flash, a ring, scraps of burlap, bills and coins.
  const CENTER = new THREE.Vector3(0, 1.0, 0);
  const flash = glowSprite(c, bag, col('#FFE7A3'), 1, 1);
  flash.position.copy(CENTER);
  flash.renderOrder = 10;
  root.add(flash);
  const ring = new THREE.Mesh(
    bag.add(new THREE.RingGeometry(0.92, 1, 96)),
    bag.add(new THREE.MeshBasicMaterial({ color: col(vibe.accent2), transparent: true, depthWrite: false, side: THREE.DoubleSide })),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  root.add(ring);
  const light = new THREE.PointLight(col('#FFD27A'), 0, 8, 1.4);
  light.position.copy(CENTER);
  root.add(light);

  const bill = canvasTexture(256, 120, (ctx) => {
    ctx.fillStyle = '#7FA877';
    ctx.fillRect(0, 0, 256, 120);
    ctx.strokeStyle = '#3E6B3C';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 240, 104);
    ctx.fillStyle = '#A9C89F';
    ctx.beginPath();
    ctx.ellipse(128, 60, 30, 38, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#3E6B3C';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#2F5530';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 30, 62);
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText('100', 190, 30);
    ctx.fillText('100', 190, 92);
  });
  bag.add(bill.tex);
  const BILLS = 80;
  const COINS = 60;
  const SCRAPS = 26;
  const bills = new THREE.InstancedMesh(
    bag.add(new THREE.BoxGeometry(0.5, 0.006, 0.235)),
    bag.add(new THREE.MeshStandardMaterial({ map: bill.tex, roughness: 0.8 })),
    BILLS,
  );
  const coins = new THREE.InstancedMesh(
    bag.add(new THREE.CylinderGeometry(0.09, 0.09, 0.022, 24)),
    bag.add(new THREE.MeshStandardMaterial({ color: col('#E2B33C'), roughness: 0.25, metalness: 0.95 })),
    COINS,
  );
  const scrapGeo = bag.add(new THREE.PlaneGeometry(0.34, 0.26, 2, 2));
  const scraps = new THREE.InstancedMesh(scrapGeo, burlap, SCRAPS);
  for (const m of [bills, coins, scraps]) {
    m.frustumCulled = false;
    root.add(m);
  }
  const r = rng(13);
  const outward = (up: number, speed: number) => {
    const a = r() * TAU;
    const tilt = r() * 0.9;
    return new THREE.Vector3(Math.cos(a) * Math.cos(tilt), up + Math.sin(tilt), Math.sin(a) * Math.cos(tilt))
      .normalize()
      .multiplyScalar(speed * (0.6 + r() * 0.8));
  };
  const billSeeds = Array.from({ length: BILLS }, () => ({
    v: outward(0.6, 3.2),
    rest: 0.006 + r() * 0.12,
    spin: new THREE.Vector3((r() - 0.5) * 6, (r() - 0.5) * 6, (r() - 0.5) * 6),
    phase: r() * TAU,
  }));
  const coinSeeds = Array.from({ length: COINS }, () => ({
    v: outward(0.9, 4),
    rest: 0.012 + r() * 0.05,
    spin: new THREE.Vector3((r() - 0.5) * 14, (r() - 0.5) * 14, (r() - 0.5) * 14),
  }));
  const scrapSeeds = Array.from({ length: SCRAPS }, () => ({
    v: outward(0.4, 4.5),
    spin: new THREE.Vector3((r() - 0.5) * 10, (r() - 0.5) * 10, (r() - 0.5) * 10),
  }));
  const BURST = 0.5;
  // The burst is timed on the clock, so the money keeps falling while the
  // opening fades into the page (k stops at 1 then).
  let burstAt: number | null = null;

  const w: World = {
    root,
    radius: 2.4,
    centerY: 1.1,
    elevation: 0.22,
    azimuth: -0.2,
    points: [],
    swoop: false,
    update(t, k) {
      if (k >= BURST && burstAt === null) burstAt = t;
      if (k < BURST) burstAt = null;
      const age = burstAt === null ? -1 : t - burstAt;

      // Drop, land with a squash, then rumble and swell toward bursting.
      const fall = phase(k, 0, 0.18);
      const land = phase(k, 0.18, 0.28);
      const swell = phase(k, 0.28, BURST);
      const squash = Math.sin(land * Math.PI) * (1 - land) * 0.6;
      const grow = 1 + 0.22 * swell * swell;
      const rumble = swell * 0.06;
      sack.visible = age < 0;
      sack.position.set(Math.sin(t * 61) * rumble, (1 - easeInCubic(fall)) * 4.5, Math.sin(t * 47) * rumble);
      sack.rotation.z = Math.sin(t * 38) * rumble * 1.2;
      sack.scale.set((1 + squash * 0.25) * grow, (1 - squash * 0.3) * (1 + 0.1 * swell * swell), (1 + squash * 0.25) * grow);
      ground.scale.setScalar(age < 0 ? 0.4 + 0.6 * easeOutCubic(fall) : Math.max(0.001, 1 - age));
      w.shake = age < 0 ? rumble * 0.3 : 0.12 * Math.exp(-age * 5);

      const e = age < 0 ? 0 : Math.exp(-age * 4.5);
      flash.visible = age >= 0;
      flash.scale.setScalar(1 + 7 * e);
      (flash.material as THREE.SpriteMaterial).opacity = e * (c.light ? 0.7 : 1);
      light.intensity = 20 * e;
      ring.visible = age >= 0 && age < 1.2;
      ring.scale.setScalar(0.5 + Math.max(0, age) * 4);
      (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - age / 1.2) * 0.7;

      // Bills: thrown out fast, then slowed by the air and fluttering down.
      billSeeds.forEach((s, i) => {
        if (age < 0) {
          _m.scale.setScalar(0.001);
          _m.rotation.set(0, 0, 0);
          _m.position.copy(CENTER);
        } else {
          const drag = (1 - Math.exp(-age * 2.2)) / 2.2;
          let y = CENTER.y + s.v.y * drag - 0.55 * age;
          const landed = y <= s.rest;
          if (landed) y = s.rest;
          _m.scale.setScalar(1);
          _m.position.set(s.v.x * drag + Math.sin(age * 3 + s.phase) * 0.15 * Math.min(1, age), y, s.v.z * drag);
          if (landed) _m.rotation.set(0, s.spin.y, 0);
          else _m.rotation.set(s.spin.x * age + Math.sin(age * 6 + s.phase) * 0.7, s.spin.y * age, s.spin.z * age);
        }
        _m.updateMatrix();
        bills.setMatrixAt(i, _m.matrix);
      });
      // Coins: thrown hard, falling fast and settling on the ground.
      coinSeeds.forEach((s, i) => {
        if (age < 0) {
          _m.scale.setScalar(0.001);
          _m.rotation.set(0, 0, 0);
          _m.position.copy(CENTER);
        } else {
          const g = 9.8;
          const tl = (s.v.y + Math.sqrt(s.v.y * s.v.y + 2 * g * (CENTER.y - s.rest))) / g;
          const ta = Math.min(age, tl);
          _m.scale.setScalar(1);
          _m.position.set(s.v.x * ta, age >= tl ? s.rest : CENTER.y + s.v.y * age - 0.5 * g * age * age, s.v.z * ta);
          if (age >= tl) _m.rotation.set(0, s.spin.y, 0);
          else _m.rotation.set(s.spin.x * age, s.spin.y * age, s.spin.z * age);
        }
        _m.updateMatrix();
        coins.setMatrixAt(i, _m.matrix);
      });
      // Burlap scraps: blown outward, tumbling, gone after a moment.
      scrapSeeds.forEach((s, i) => {
        if (age < 0 || age > 1.4) {
          _m.scale.setScalar(0.001);
          _m.rotation.set(0, 0, 0);
          _m.position.copy(CENTER);
        } else {
          _m.scale.setScalar(1 - age / 1.4);
          _m.position.set(s.v.x * age, CENTER.y + s.v.y * age - 3 * age * age, s.v.z * age);
          _m.rotation.set(s.spin.x * age, s.spin.y * age, s.spin.z * age);
        }
        _m.updateMatrix();
        scraps.setMatrixAt(i, _m.matrix);
      });
      for (const m of [bills, coins, scraps]) m.instanceMatrix.needsUpdate = true;
    },
    dispose: () => bag.dispose(),
  };
  return w;
}

// ── BioSphere: a brain taking shape ─────────────────────────────────────────
// A cloud of motes gathers into the shape of a brain, the brain fills in and
// lights up, and smooth ribbons draw themselves in circling around it.

function brainForms(c: BuildCtx): World {
  const { vibe } = c;
  const bag = new Bag();
  const root = new THREE.Group();
  const brain = brainModel(c, bag, 29);
  root.add(brain.group);
  const MOTES = 420;
  const motes = glowPoints(c, bag, MOTES, 0.24);
  root.add(motes.pts);
  const r = rng(71);
  const seeds = Array.from({ length: MOTES }, () => {
    const d = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
    const target = d.clone().multiply(new THREE.Vector3(0.98, 0.84, 1.26)).multiplyScalar(1.02);
    const from = d.clone().multiplyScalar(4 + r() * 5).add(new THREE.Vector3((r() - 0.5) * 3, (r() - 0.5) * 3, (r() - 0.5) * 3));
    return { target, from, delay: r() * 0.15, tone: r() < 0.5 ? vibe.accent : vibe.accent2 };
  });

  // Smooth ribbons circling the brain.
  const SEG = 260;
  const RAD = 8;
  const ribbons = vibe.flowColors.slice(0, 3).map((hex, i) => {
    const pts: THREE.Vector3[] = [];
    const rad = 1.85 + i * 0.18;
    for (let j = 0; j < 64; j++) {
      const a = (j / 64) * TAU;
      pts.push(new THREE.Vector3(Math.cos(a) * rad, Math.sin(a * 3 + i * 2) * 0.28, Math.sin(a) * rad));
    }
    const geo = bag.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), SEG, 0.032 - i * 0.006, RAD, true));
    const mesh = new THREE.Mesh(
      geo,
      bag.add(new THREE.MeshStandardMaterial({ color: col(hex), emissive: col(hex), emissiveIntensity: c.light ? 0.1 : 0.45, roughness: 0.4 })),
    );
    const g = new THREE.Group();
    g.rotation.set(0.5 - i * 0.45, i * 1.1, 0.25 * (i - 1));
    const spinner = new THREE.Group();
    spinner.add(mesh);
    g.add(spinner);
    root.add(g);
    return { geo, spinner, speed: 0.35 + i * 0.12 };
  });

  return {
    root,
    radius: 2.2,
    centerY: 0,
    elevation: 0.15,
    azimuth: 1.2,
    points: [motes.mat, brain.sparksMaterial],
    swoop: false,
    update(t, k) {
      for (let i = 0; i < MOTES; i++) {
        const s = seeds[i];
        const g = easeInOutCubic(phase(k, s.delay, s.delay + 0.4));
        _v.lerpVectors(s.from, s.target, g);
        _v.toArray(motes.pos, i * 3);
        const fade = 1 - phase(k, 0.5, 0.75);
        _c.set(s.tone).multiplyScalar((0.7 + 0.8 * g) * fade);
        _c.toArray(motes.colors, i * 3);
      }
      motes.geo.attributes.position.needsUpdate = true;
      motes.geo.attributes.color.needsUpdate = true;
      motes.pts.visible = k < 0.75;
      const bk = phase(k, 0.35, 0.6);
      brain.group.scale.setScalar(Math.max(0.001, easeOutBack(bk)));
      brain.group.rotation.y = t * 0.4;
      brain.update(t, phase(k, 0.55, 0.75));
      const rk = easeInOutCubic(phase(k, 0.4, 0.95));
      for (const rb of ribbons) {
        rb.geo.setDrawRange(0, Math.floor(rk * SEG) * RAD * 6);
        rb.spinner.rotation.y = t * rb.speed;
      }
    },
    dispose: () => bag.dispose(),
  };
}

// ── CivicVerse: a gavel strike ──────────────────────────────────────────────
// Seen from the front: a gavel rises over its sound block on a wooden bench
// and comes down once, flat face first. The strike shakes the view, flashes,
// throws a ring across the wood and a spray of dust.

function gavel(c: BuildCtx): World {
  const { vibe } = c;
  const bag = new Bag();
  const root = new THREE.Group();
  const wood = bag.add(new THREE.MeshPhysicalMaterial({ color: col('#5B3A21'), roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.3 }));
  const darkWood = bag.add(new THREE.MeshPhysicalMaterial({ color: col('#3E2614'), roughness: 0.4, clearcoat: 0.5 }));
  const gold = bag.add(new THREE.MeshStandardMaterial({ color: col('#D4AF5A'), roughness: 0.25, metalness: 0.95 }));

  const bench = new THREE.Mesh(bag.add(new RoundedBoxGeometry(5.2, 0.2, 2.6, 3, 0.05)), wood);
  const block = new THREE.Group();
  block.add(new THREE.Mesh(bag.add(new THREE.CylinderGeometry(0.58, 0.64, 0.22, 48)), darkWood));
  const band = new THREE.Mesh(bag.add(new THREE.TorusGeometry(0.61, 0.018, 8, 64)), gold);
  band.rotation.x = Math.PI / 2;
  block.add(band);
  block.position.set(0, 0.21, 0);
  root.add(bench, block);
  const BLOCK_TOP = 0.32;

  // The gavel swings in the plane facing the viewer, pivoting at the hand end
  // of its handle. The head's axis is square to the handle and lies in that
  // plane, so at the bottom of the swing its flat face meets the block.
  const L = 1.65;
  const HEAD_LEN = 0.66;
  const HEAD_R = 0.2;
  const pivot = new THREE.Group();
  pivot.position.set(L, 0.95, 0);
  const handle = new THREE.Mesh(bag.add(new THREE.CylinderGeometry(0.05, 0.07, L, 24)), darkWood);
  handle.rotation.z = Math.PI / 2;
  handle.position.x = -L / 2;
  const head = new THREE.Group();
  head.add(new THREE.Mesh(bag.add(new THREE.CylinderGeometry(HEAD_R, HEAD_R, HEAD_LEN, 40)), darkWood));
  for (const y of [-0.22, 0.22]) {
    const ring = new THREE.Mesh(bag.add(new THREE.TorusGeometry(HEAD_R + 0.002, 0.018, 8, 48)), gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    head.add(ring);
  }
  head.position.x = -L;
  pivot.add(handle, head);
  root.add(pivot);
  // Rotation about z: negative lifts the head. At HIT the head's lower face
  // sits on the block: its centre is HEAD_LEN / 2 above the block's top. The
  // head is set square to the block at that angle, so the face lands flat.
  const HIT = Math.asin((pivot.position.y - (BLOCK_TOP + HEAD_LEN / 2)) / L);
  const RAISED = -1.0;
  head.rotation.z = -HIT;

  const ring = new THREE.Mesh(
    bag.add(new THREE.RingGeometry(0.9, 1, 96)),
    bag.add(new THREE.MeshBasicMaterial({ color: col(vibe.accent), transparent: true, depthWrite: false, side: THREE.DoubleSide })),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.105;
  root.add(ring);
  const flash = glowSprite(c, bag, col(vibe.accent), 1, 1);
  flash.position.set(0, BLOCK_TOP + 0.05, 0.3);
  root.add(flash);
  const lamp = new THREE.PointLight(col(vibe.accent), 0, 6, 1.5);
  lamp.position.set(0, 0.9, 0.6);
  root.add(lamp);
  const DUST = 90;
  const dust = glowPoints(c, bag, DUST, 0.09);
  root.add(dust.pts);
  const r = rng(19);
  const dustSeeds = Array.from({ length: DUST }, () => ({ a: r() * TAU, v: 0.8 + r() * 1.8, up: 0.8 + r() * 1.6 }));
  const STRIKE = 0.5;

  const w: World = {
    root,
    radius: 2.2,
    centerY: 0.75,
    elevation: 0.14,
    azimuth: 0,
    points: [dust.mat],
    swoop: false,
    update(_t, k) {
      root.position.y = (1 - easeOutCubic(phase(k, 0, 0.18))) * -2;
      // Raise and wind up, one hard strike, a small rebound, then rest there.
      let a: number;
      if (k < 0.4) a = RAISED - 0.15 * easeInOutCubic(phase(k, 0.12, 0.4));
      else if (k < STRIKE) a = RAISED - 0.15 + (HIT - RAISED + 0.15) * easeInCubic(phase(k, 0.4, STRIKE));
      else a = HIT - 0.18 * Math.sin(phase(k, STRIKE, 0.68) * Math.PI) * (1 - phase(k, STRIKE, 0.68));
      pivot.rotation.z = a;

      const age = (k - STRIKE) * SECONDS;
      if (age >= 0) {
        const e = Math.exp(-age * 5);
        ring.visible = age < 1.2;
        ring.scale.setScalar(0.4 + age * 3.4);
        (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - age / 1.2) * 0.8;
        flash.scale.setScalar(1 + 3.5 * e);
        (flash.material as THREE.SpriteMaterial).opacity = e * (c.light ? 0.5 : 0.9);
        lamp.intensity = 14 * e;
        w.shake = 0.09 * e;
        for (let i = 0; i < DUST; i++) {
          const s = dustSeeds[i];
          dust.pos.set(
            [Math.cos(s.a) * s.v * age, Math.max(0.12, 0.4 + s.up * age - 2.5 * age * age), Math.sin(s.a) * s.v * age],
            i * 3,
          );
          _c.set(vibe.accent).multiplyScalar(Math.max(0, 1 - age * 1.2));
          _c.toArray(dust.colors, i * 3);
        }
        dust.geo.attributes.position.needsUpdate = true;
        dust.geo.attributes.color.needsUpdate = true;
      } else {
        ring.visible = false;
        (flash.material as THREE.SpriteMaterial).opacity = 0;
        lamp.intensity = 0;
        w.shake = 0;
      }
    },
    dispose: () => bag.dispose(),
  };
  return w;
}

// ── ImagineX: a sketch of Emerald High ──────────────────────────────────────
// A canvas on an easel draws Emerald High School's entrance, as it looks from
// the front walk: first in pencil (the cantilevered roof, the window strip,
// the angled entrance canopy on its round columns, the glass doors, the lime
// Administration block), then watercolor washes laid in under the lines, and
// last the lettering on the canopy and the green wall. A brush follows
// whatever is being drawn.

/** Points in the reference photo's pixels (1096 × 806), mapped onto the canvas. */
type Pt = [number, number];
const PHOTO_W = 1096;
const PHOTO_H = 806;

/** The pencil lines, in drawing order. */
function schoolLines(): Pt[][] {
  const lines: Pt[][] = [
    // Roof: a thin light fascia, its far edge, and the dark underside where
    // it overhangs on the right.
    [[345, 350], [855, 35], [1050, 290]],
    [[345, 350], [356, 372], [866, 62], [855, 35]],
    [[866, 62], [1050, 305], [1050, 290]],
    [[860, 185], [955, 300]],
    // The plain white band under the roof (no windows), the grey siding and
    // its darker return.
    [[430, 392], [870, 215]],
    [[860, 185], [870, 215]],
    [[430, 392], [440, 470], [900, 412], [870, 215]],
    [[870, 215], [955, 300], [968, 450], [900, 412]],
  ];
  // Siding courses.
  for (let i = 1; i < 6; i++) {
    const y0 = 440 + i * 6;
    lines.push([[445, y0 - 0], [895, y0 - 52 - i * 2]]);
  }
  lines.push(
    // Glass doors: outline only.
    [[436, 640], [598, 640], [598, 806]],
    // The Administration block and its window.
    [[598, 562], [980, 460], [1030, 806]],
    [[598, 562], [600, 806]],
    [[668, 692], [830, 692], [830, 776], [668, 776], [668, 692]],
    [[750, 692], [750, 776]],
    // The wing on the right and the building beyond on the left.
    [[968, 450], [1096, 470]],
    [[955, 300], [1040, 330], [1096, 318]],
    [[0, 600], [30, 585], [95, 575], [95, 806]],
    [[30, 585], [30, 806]],
    // Ground.
    [[0, 800], [1096, 800]],
  );
  return lines;
}

/**
 * The canopy and its columns, drawn over everything behind them (washes and
 * pencil both), so nothing behind shows through. The columns rise to where
 * the canopy's underside meets the wall.
 */
function schoolFrontLines(): Pt[][] {
  return [
    [[0, 450], [228, 318], [680, 462], [680, 530], [228, 408], [0, 540]],
    [[228, 318], [228, 408]],
    [[0, 600], [200, 505], [610, 560], [680, 530]],
    [[185, 512], [185, 806]],
    [[222, 508], [222, 806]],
    [[305, 519], [305, 806]],
    [[340, 524], [340, 806]],
    [[402, 532], [402, 806]],
    [[436, 537], [436, 806]],
  ];
}

/** Watercolor washes, painted in this order under the pencil; `front` ones go over the back pencil. */
const SCHOOL_WASHES: { color: string; poly: Pt[]; front?: boolean }[] = [
  { color: '#8FC3EE', poly: [[0, 0], [1096, 0], [1096, 806], [0, 806]] },
  // Roof: the light fascia and far edge, then the dark underside.
  { color: '#E4E5E8', poly: [[345, 350], [855, 35], [866, 62], [356, 372]] },
  { color: '#D2D3D7', poly: [[855, 35], [1050, 290], [1050, 305], [866, 62]] },
  { color: '#55575E', poly: [[866, 62], [1050, 305], [1040, 330], [955, 300], [860, 185]] },
  // The plain white band under the roof.
  { color: '#F2F2F4', poly: [[356, 372], [866, 62], [860, 185], [870, 215], [430, 392]] },
  // Grey siding and its darker return.
  { color: '#A9A9AE', poly: [[430, 392], [870, 215], [900, 412], [440, 470]] },
  { color: '#84848C', poly: [[860, 185], [955, 300], [968, 450], [900, 412], [870, 215]] },
  { color: '#ECEBE7', poly: [[0, 600], [200, 505], [610, 560], [598, 562], [600, 806], [0, 806]] },
  // The white wall between the grey siding and the green block (no sky shows there).
  { color: '#F1F1F3', poly: [[440, 470], [900, 412], [968, 450], [980, 460], [598, 562], [610, 560], [680, 530], [680, 462]] },
  // The grey wing on the right, up to the roof's far end.
  { color: '#D9D9DC', poly: [[955, 300], [1040, 330], [1050, 305], [1050, 290], [1096, 296], [1096, 806], [1030, 806], [980, 460], [968, 450]] },
  { color: '#3F9C4D', poly: [[30, 585], [62, 580], [62, 806], [30, 806]] },

  { color: '#3E4A57', poly: [[436, 640], [598, 640], [598, 806], [436, 806]] },
  { color: '#A6D75A', poly: [[598, 562], [980, 460], [1030, 806], [600, 806]] },
  { color: '#3E4A57', poly: [[668, 692], [830, 692], [830, 776], [668, 776]] },
  // In front: the canopy (left end, underside, sign face) and the columns.
  { color: '#C9CACD', poly: [[0, 450], [228, 318], [228, 408], [0, 540]], front: true },
  { color: '#7C7E84', poly: [[0, 540], [228, 408], [680, 530], [610, 560], [200, 505], [0, 600]], front: true },
  { color: '#5C5E64', poly: [[228, 318], [680, 462], [680, 530], [228, 408]], front: true },
  { color: '#D7D2C9', poly: [[185, 512], [222, 508], [222, 806], [185, 806]], front: true },
  { color: '#D7D2C9', poly: [[305, 519], [340, 524], [340, 806], [305, 806]], front: true },
  { color: '#D7D2C9', poly: [[402, 532], [436, 537], [436, 806], [402, 806]], front: true },
];

/** Signage: text along a line from `from` to `to`, at a size in photo pixels. */
const SCHOOL_SIGNS: { text: string; from: Pt; to: Pt; size: number; color: string }[] = [
  { text: 'EMERALD HIGH SCHOOL', from: [282, 362], to: [655, 486], size: 40, color: '#E8EEF4' },
  // Level, not following the wall's slant.
  { text: 'ADMINISTRATION', from: [650, 612], to: [930, 612], size: 40, color: '#FFFFFF' },
];

function studio(_c: BuildCtx): World {
  const bag = new Bag();
  const root = new THREE.Group();
  const wood = bag.add(new THREE.MeshStandardMaterial({ color: col('#7A5532'), roughness: 0.7 }));
  const steel = bag.add(new THREE.MeshStandardMaterial({ color: col('#B9C0C8'), roughness: 0.25, metalness: 0.9 }));

  const easel = new THREE.Group();
  const legGeo = bag.add(new THREE.BoxGeometry(0.06, 2.9, 0.06));
  for (const [x, z, rz, rx] of [[-0.55, 0.1, 0.12, -0.05], [0.55, 0.1, -0.12, -0.05], [0, -0.45, 0, 0.3]]) {
    const leg = new THREE.Mesh(legGeo, wood);
    leg.position.set(x, 1.4, z);
    leg.rotation.set(rx, 0, rz);
    easel.add(leg);
  }
  const ledge = new THREE.Mesh(bag.add(new THREE.BoxGeometry(1.5, 0.06, 0.18)), wood);
  ledge.position.set(0, 0.95, 0.18);
  easel.add(ledge);
  const CW = 1024;
  const CH = 768;
  const art = canvasTexture(CW, CH, () => {});
  bag.add(art.tex);
  art.tex.anisotropy = 4;
  const frameBox = new THREE.Mesh(
    bag.add(new THREE.BoxGeometry(1.6, 1.2, 0.05)),
    bag.add(new THREE.MeshStandardMaterial({ color: col('#E9E2D3'), roughness: 0.9 })),
  );
  frameBox.position.set(0, 1.6, 0.2);
  frameBox.rotation.x = -0.06;
  const face = new THREE.Mesh(
    bag.add(new THREE.PlaneGeometry(1.56, 1.17)),
    bag.add(new THREE.MeshStandardMaterial({ map: art.tex, roughness: 0.85 })),
  );
  face.position.z = 0.027;
  frameBox.add(face);
  easel.add(frameBox);
  const brush = new THREE.Group();
  const handle = new THREE.Mesh(
    bag.add(new THREE.CylinderGeometry(0.018, 0.012, 0.5, 12)),
    bag.add(new THREE.MeshStandardMaterial({ color: col('#B0412E'), roughness: 0.4 })),
  );
  handle.position.y = 0.3;
  const ferrule = new THREE.Mesh(bag.add(new THREE.CylinderGeometry(0.02, 0.018, 0.07, 12)), steel);
  ferrule.position.y = 0.04;
  const tipMat = bag.add(new THREE.MeshStandardMaterial({ color: col('#3A3A44'), roughness: 0.6 }));
  const tip = new THREE.Mesh(bag.add(new THREE.ConeGeometry(0.022, 0.08, 12)), tipMat);
  tip.rotation.x = Math.PI;
  tip.position.y = -0.03;
  brush.add(handle, ferrule, tip);
  brush.rotation.set(0.6, 0, -0.5);
  frameBox.add(brush);
  root.add(easel);

  // The drawing, redrawn whole each frame while it's being made, in two
  // layers so the canopy hides what's behind it: back washes, back pencil,
  // front washes, front pencil, then the lettering.
  const sx = CW / PHOTO_W;
  const sy = CH / PHOTO_H;
  const X = (p: Pt) => p[0] * sx;
  const Y = (p: Pt) => p[1] * sy;
  type Seg = { a: Pt; b: Pt; front: boolean };
  const segs: Seg[] = [];
  const addLines = (lines: Pt[][], front: boolean) => {
    for (const line of lines)
      for (let i = 1; i < line.length; i++) segs.push({ a: line[i - 1], b: line[i], front });
  };
  addLines(schoolLines(), false);
  addLines(schoolFrontLines(), true);
  const GRAPHITE = '#34343C';

  /** A straight pencil stroke from a toward b, fraction f of the way. */
  const pencil = (ctx: CanvasRenderingContext2D, sg: Seg, f: number) => {
    ctx.lineWidth = 2.4;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(X(sg.a), Y(sg.a));
    ctx.lineTo(X(sg.a) + (X(sg.b) - X(sg.a)) * f, Y(sg.a) + (Y(sg.b) - Y(sg.a)) * f);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  let lastKey = '';
  /** Draws the state at sketch s, wash w and lettering l (each 0..1); returns where the brush is, in photo pixels, and its color. */
  const draw = (s: number, w: number, l: number): { at: Pt; color: string } => {
    const ctx = art.ctx;
    let at: Pt = [548, 400];
    let color = GRAPHITE;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#F7F3EA';
    ctx.fillRect(0, 0, CW, CH);

    const nW = SCHOOL_WASHES.length;
    const washLayer = (front: boolean) => {
      SCHOOL_WASHES.forEach((wash, i) => {
        if (!!wash.front !== front) return;
        const a = clamp01(w * nW - i);
        if (a <= 0) return;
        ctx.beginPath();
        wash.poly.forEach((p, j) => (j ? ctx.lineTo(X(p), Y(p)) : ctx.moveTo(X(p), Y(p))));
        ctx.closePath();
        ctx.globalAlpha = (front ? 1 : 0.88) * a;
        ctx.fillStyle = wash.color;
        ctx.fill();
        if (a < 1) {
          const cx = wash.poly.reduce((n, p) => n + p[0], 0) / wash.poly.length;
          const cy = wash.poly.reduce((n, p) => n + p[1], 0) / wash.poly.length;
          at = [cx + Math.sin(a * 20) * 30, cy + Math.cos(a * 17) * 20];
          color = wash.color;
        }
      });
      ctx.globalAlpha = 1;
    };

    // Pencil: whole segments up to the head, then part of the one being drawn.
    const head = s * segs.length;
    const full = Math.floor(head);
    const pencilLayer = (front: boolean) => {
      ctx.strokeStyle = GRAPHITE;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < Math.min(full + 1, segs.length); i++) {
        const sg = segs[i];
        if (sg.front !== front) continue;
        const f = i < full ? 1 : head - full;
        if (f <= 0) continue;
        pencil(ctx, sg, f);
        if (i === full && w <= 0) {
          at = [sg.a[0] + (sg.b[0] - sg.a[0]) * f, sg.a[1] + (sg.b[1] - sg.a[1]) * f];
          color = GRAPHITE;
        }
      }
    };

    washLayer(false);
    pencilLayer(false);
    washLayer(true);
    pencilLayer(true);

    // Lettering, one character at a time along each sign.
    const total = SCHOOL_SIGNS.reduce((n, sg) => n + sg.text.length, 0);
    let left = Math.floor(l * total);
    for (const sign of SCHOOL_SIGNS) {
      if (left <= 0) break;
      const shown = sign.text.slice(0, left);
      left -= sign.text.length;
      const ang = Math.atan2(sign.to[1] - sign.from[1], sign.to[0] - sign.from[0]);
      const len = Math.hypot((sign.to[0] - sign.from[0]) * sx, (sign.to[1] - sign.from[1]) * sy);
      ctx.save();
      ctx.translate(X(sign.from), Y(sign.from));
      ctx.rotate(ang);
      // Size the letters so the whole sign fills 94% of its length, no larger
      // than its size in the photo, then spread them to fill it exactly.
      ctx.font = `bold 100px "Helvetica Neue", Arial, sans-serif`;
      const px = Math.min(sign.size * sy, (100 * len * 0.94) / ctx.measureText(sign.text).width);
      ctx.font = `bold ${px}px "Helvetica Neue", Arial, sans-serif`;
      const fullW = ctx.measureText(sign.text).width;
      const spacing = (len - fullW) / Math.max(1, sign.text.length - 1);
      ctx.fillStyle = sign.color;
      ctx.textBaseline = 'middle';
      // A soft shadow so light letters read on the pale green wall.
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetY = 1.5;
      let x = 0;
      for (const ch of shown) {
        ctx.fillText(ch, x, 0);
        x += ctx.measureText(ch).width + spacing;
      }
      ctx.restore();
      if (l < 1) {
        at = [sign.from[0] + (x / sx) * Math.cos(ang), sign.from[1] + (x / sy) * Math.sin(ang)];
        color = sign.color;
      }
    }
    art.tex.needsUpdate = true;
    return { at, color };
  };

  return {
    root,
    radius: 1.15,
    centerY: 1.62,
    elevation: 0.08,
    azimuth: 0,
    points: [],
    swoop: false,
    update(t, k) {
      easel.position.y = (1 - easeOutBack(phase(k, 0, 0.2))) * -2.5;
      // Finished by k = 0.78, then it rests on the easel to be enjoyed.
      const s = easeInOutCubic(phase(k, 0.08, 0.45));
      const w = phase(k, 0.42, 0.68);
      const l = phase(k, 0.66, 0.78);
      const key = `${s.toFixed(4)}|${w.toFixed(4)}|${l.toFixed(4)}`;
      if (key !== lastKey) {
        lastKey = key;
        const { at, color } = draw(s, w, l);
        brush.position.set((at[0] / PHOTO_W - 0.5) * 1.56, (0.5 - at[1] / PHOTO_H) * 1.17, 0.07);
        tipMat.color.set(color);
      }
      brush.visible = k > 0.08 && k < 0.8;
      root.rotation.y = Math.sin(t * 0.4) * 0.1;
    },
    dispose: () => bag.dispose(),
  };
}

// ── NovaSphere: a campfire ──────────────────────────────────────────────────
// A campfire in a ring of stones: split logs in a teepee over glowing coals,
// layered flames licking up and flickering, sparks spiralling off, and a
// column of smoke rising and drifting away. Its light flickers on the stones.

function smokeTexture() {
  return canvasTexture(128, 128, (ctx) => {
    // Lumpy billows: many soft blobs, brighter toward the middle, with a few
    // holes punched out so it reads as wisps rather than a disc.
    const r = rng(101);
    for (let i = 0; i < 26; i++) {
      const a = r() * TAU;
      const d = r() * 34;
      const x = 64 + Math.cos(a) * d;
      const y = 64 + Math.sin(a) * d;
      const rad = 10 + r() * 22;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(255,255,255,${0.25 + r() * 0.3})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
    }
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 10; i++) {
      const x = 64 + (r() - 0.5) * 80;
      const y = 64 + (r() - 0.5) * 80;
      const rad = 6 + r() * 12;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(0,0,0,0.5)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
    }
  }).tex;
}

/** A tongue of flame: bright at the bottom, tapering to a soft point. */
function flameTexture() {
  return canvasTexture(64, 128, (ctx) => {
    const g = ctx.createRadialGradient(32, 100, 2, 32, 84, 60);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(32, 2);
    ctx.bezierCurveTo(50, 40, 62, 78, 54, 104);
    ctx.bezierCurveTo(48, 124, 16, 124, 10, 104);
    ctx.bezierCurveTo(2, 78, 14, 40, 32, 2);
    ctx.fill();
  }).tex;
}

function campfire(c: BuildCtx): World {
  const bag = new Bag();
  const root = new THREE.Group();
  const r = rng(59);

  // Stones: lumpy, flattened, a ring.
  const stoneGeo = bag.add(new THREE.IcosahedronGeometry(0.2, 2));
  const sp = stoneGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    _v.fromBufferAttribute(sp, i);
    const n = 1 + 0.12 * Math.sin(_v.x * 23 + _v.y * 17) * Math.cos(_v.z * 19 - _v.x * 7);
    sp.setXYZ(i, _v.x * n, _v.y * n * 0.62, _v.z * n);
  }
  stoneGeo.computeVertexNormals();
  const STONES = 11;
  const stones = new THREE.InstancedMesh(stoneGeo, bag.add(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })), STONES);
  for (let i = 0; i < STONES; i++) {
    const a = (i / STONES) * TAU + r() * 0.2;
    _m.position.set(Math.cos(a) * 0.95, 0.08, Math.sin(a) * 0.95);
    _m.rotation.set(r() * 0.4, r() * TAU, r() * 0.4);
    _m.scale.setScalar(0.8 + r() * 0.5);
    _m.updateMatrix();
    stones.setMatrixAt(i, _m.matrix);
    stones.setColorAt(i, _c.set('#4E4A45').multiplyScalar(0.7 + r() * 0.45));
  }

  // Logs in a teepee, charred and glowing low down.
  const bark = bag.add(new THREE.MeshStandardMaterial({ color: col('#4A3221'), roughness: 0.95 }));
  const logGeo = bag.add(new THREE.CylinderGeometry(0.07, 0.085, 1.0, 10));
  const logs = new THREE.Group();
  const LOGS = 6;
  for (let i = 0; i < LOGS; i++) {
    const a = (i / LOGS) * TAU + 0.3;
    const log = new THREE.Mesh(logGeo, bark);
    // Lean in so the tops meet over the middle.
    log.position.set(Math.cos(a) * 0.32, 0.34, Math.sin(a) * 0.32);
    log.lookAt(0, 0.85, 0);
    log.rotateX(Math.PI / 2);
    logs.add(log);
  }
  const coals = new THREE.Mesh(
    bag.add(new THREE.CircleGeometry(0.55, 40)),
    bag.add(new THREE.MeshBasicMaterial({ map: c.glow, color: col('#FF5A14'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })),
  );
  coals.rotation.x = -Math.PI / 2;
  coals.position.y = 0.03;
  root.add(stones, logs, coals);

  // Flames: tongues rising from the coals, white-yellow at the root, orange,
  // then red as they thin out and fade at the tip.
  const flameTex = bag.add(flameTexture());
  const FLAMES = 60;
  const hot = col('#FFF1C1');
  const mid = col('#FFA23A');
  const tipC = col('#E2381B');
  const flames = Array.from({ length: FLAMES }, (_, i) => {
    const m = bag.add(
      new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }),
    );
    const s = new THREE.Sprite(m);
    s.renderOrder = 10;
    root.add(s);
    const a = r() * TAU;
    const rad = Math.sqrt(r()) * 0.28;
    return { s, x: Math.cos(a) * rad, z: Math.sin(a) * rad, life: 0.55 + r() * 0.5, off: r(), size: 0.55 + r() * 0.5, sway: r() * TAU, i };
  });
  const glow = glowSprite(c, bag, col('#FF8A2A'), 3.2, 0.55);
  glow.position.y = 0.55;
  glow.renderOrder = 9;
  root.add(glow);
  const fireLight = new THREE.PointLight(col('#FF8A3A'), 0, 7, 1.3);
  fireLight.position.set(0, 0.6, 0);
  root.add(fireLight);

  // Sparks spiralling up.
  const SPARKS = 50;
  const sparks = glowPoints(c, bag, SPARKS, 0.06);
  root.add(sparks.pts);
  const sparkSeeds = Array.from({ length: SPARKS }, () => ({ off: r(), speed: 0.4 + r() * 0.5, a: r() * TAU, spin: 1 + r() * 2 }));

  // Smoke: a column rising from the top of the flames and drifting off.
  const smokeTex = bag.add(smokeTexture());
  const PUFFS = 34;
  const grey = c.light ? col('#77777F') : col('#A9ADB5');
  const puffs = Array.from({ length: PUFFS }, () => {
    const m = bag.add(new THREE.SpriteMaterial({ map: smokeTex, color: grey, transparent: true, depthWrite: false, opacity: 0 }));
    const s = new THREE.Sprite(m);
    root.add(s);
    return { s, off: r(), drift: 0.3 + r() * 0.5, spin: (r() - 0.5) * 1.5, shade: 0.6 + r() * 0.4 };
  });

  return {
    root,
    radius: 1.7,
    centerY: 1.0,
    elevation: 0.32,
    azimuth: 0,
    points: [sparks.mat],
    swoop: false,
    update(t, k) {
      root.position.y = (1 - easeOutCubic(phase(k, 0, 0.2))) * -1.5;
      const fire = easeOutCubic(phase(k, 0.12, 0.4)); // it catches, then roars
      const smokeOn = phase(k, 0.3, 0.6);
      const flicker = 0.85 + 0.1 * Math.sin(t * 17) + 0.05 * Math.sin(t * 31 + 1);
      fireLight.intensity = 9 * fire * flicker;
      glow.scale.setScalar(3.2 * fire * flicker);
      (coals.material as THREE.MeshBasicMaterial).opacity = 0.6 + 0.3 * fire;

      for (const f of flames) {
        const u = ((t / f.life) + f.off) % 1; // 0 at the coals, 1 at the tip
        const m = f.s.material as THREE.SpriteMaterial;
        const rise = u * (1.2 + f.size);
        const lean = Math.sin(t * 3 + f.sway) * 0.06 * u;
        f.s.position.set(f.x * (1 - u * 0.7) + lean, 0.15 + rise, f.z * (1 - u * 0.7));
        const size = f.size * (1 - u * 0.55) * fire;
        f.s.scale.set(size * 0.55, size, 1);
        if (u < 0.35) m.color.lerpColors(hot, mid, u / 0.35);
        else m.color.lerpColors(mid, tipC, (u - 0.35) / 0.65);
        m.opacity = Math.sin(Math.min(1, u * 5) * Math.PI * 0.5) * (1 - u * 0.85) * fire * (c.light ? 1 : 0.9);
      }

      for (let i = 0; i < SPARKS; i++) {
        const s = sparkSeeds[i];
        const u = (t * s.speed + s.off) % 1;
        const a = s.a + u * s.spin * TAU;
        sparks.pos.set([Math.cos(a) * 0.15 * (1 + u * 2), 0.4 + u * 2.4, Math.sin(a) * 0.15 * (1 + u * 2)], i * 3);
        _c.set('#FFB347').multiplyScalar((1 - u) * fire * (Math.sin(t * 20 + i) > -0.3 ? 1 : 0.2));
        _c.toArray(sparks.colors, i * 3);
      }
      sparks.geo.attributes.position.needsUpdate = true;
      sparks.geo.attributes.color.needsUpdate = true;

      for (const p of puffs) {
        const u = (t * 0.28 + p.off) % 1;
        const m = p.s.material as THREE.SpriteMaterial;
        p.s.position.set(u * u * 1.4 * p.drift + Math.sin(t * 0.8 + p.off * 9) * 0.1, 1.55 + u * 2.6, -0.1 * u);
        p.s.scale.setScalar(0.4 + u * 1.8);
        m.rotation = p.spin * u * 3;
        m.color.copy(grey).multiplyScalar(p.shade);
        m.opacity = Math.sin(Math.min(1, u * 4) * Math.PI * 0.5) * (1 - u) * 0.55 * smokeOn;
      }
    },
    dispose: () => bag.dispose(),
  };
}

const INTROS: Partial<Record<WorldKind, (c: BuildCtx) => World>> = {
  circuit: computer,
  ticker: moneyBag,
  cells: brainForms,
  ripples: gavel,
  paint: studio,
  stars: campfire,
};

export function hasIntro(kind: WorldKind): boolean {
  return kind in INTROS;
}

export function buildIntro(kind: WorldKind, ctx: BuildCtx): World {
  const build = INTROS[kind];
  if (!build) throw new Error(`No opening scene for ${kind}`);
  return build(ctx);
}

