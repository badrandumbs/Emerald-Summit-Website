// One WebGL renderer for every discipline world on the page. Each world is a
// "view": its own scene and camera drawn into a 2D canvas the component owns.
// The engine renders a view into the corner of its offscreen buffer and copies
// that onto the view's canvas, so six panels plus an open discipline cost one
// GPU context instead of seven.
//
// A view keeps moving for as long as it is on screen (it never eases to a
// stop). Off screen or in a hidden tab it pauses and resumes where it left
// off. Panels pause while a full-screen world covers them. Reduced motion
// draws one still, assembled frame and only redraws on resize.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { VerseVibe } from '../../../models/verseVibes';
import { buildWorld, easeOutCubic, type World, type WorldKind } from './worlds';
import { buildIntro } from './intros';

export type { WorldKind };

/** Where the world sits in its canvas: centre (0..1 of width/height) and size (0..1 of the shorter side). */
export interface ViewTargets {
  fx: number;
  fy: number;
  fill: number;
}

export interface ViewConfig {
  /** A discipline's opening scene (intros.ts) on a transparent background, played over the blurred page. */
  intro?: boolean;
  kind: WorldKind;
  vibe: VerseVibe;
  light: boolean;
  /** Full-screen world (an open discipline): covers the panels, so they pause. */
  full: boolean;
  /** Follows the pointer with a little parallax. */
  interactive: boolean;
  reduced: boolean;
}

/** Settled clock for reduced motion: a representative still. */
const STILL = 2.5;
const FOV = 30;

class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly env: THREE.Texture;
  readonly glow: THREE.Texture;
  readonly views = new Set<WorldView>();
  bufW = 0;
  bufH = 0;
  pointer = { x: 0, y: 0, seen: false };
  private frame = 0;
  private last = 0;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.setScissorTest(true);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.env = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();
    this.glow = makeGlowTexture();

    window.addEventListener(
      'pointermove',
      (e) => {
        this.pointer = { x: e.clientX, y: e.clientY, seen: true };
        for (const v of this.views) if (v.cfg.interactive) v.nudge();
        this.kick();
      },
      { passive: true },
    );
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.kick();
    });
  }

  ensure(pw: number, ph: number) {
    if (pw <= this.bufW && ph <= this.bufH) return;
    this.bufW = Math.max(this.bufW, pw);
    this.bufH = Math.max(this.bufH, ph);
    this.renderer.setSize(this.bufW, this.bufH, false);
  }

  get covered() {
    for (const v of this.views) if (v.cfg.full) return true;
    return false;
  }

  kick() {
    if (this.frame || document.hidden) return;
    this.last = 0;
    this.frame = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.frame = 0;
    if (document.hidden) return;
    const dt = this.last ? Math.min((now - this.last) / 1000, 0.05) : 1 / 60;
    this.last = now;
    const covered = this.covered;
    let busy = false;
    for (const v of this.views) {
      if (!v.onScreen || (covered && !v.cfg.full)) continue;
      if (v.step(dt)) {
        v.render();
        busy = true;
      }
    }
    if (busy) this.frame = requestAnimationFrame(this.tick);
  };
}

function makeGlowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.22, 'rgba(255,255,255,0.6)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let engine: Engine | null | undefined;

function getEngine(): Engine | null {
  if (engine !== undefined) return engine;
  try {
    engine = new Engine();
  } catch {
    engine = null; // No WebGL: the panels keep their plain colors.
  }
  return engine;
}

export class WorldView {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  readonly world: World;
  onScreen = true;
  private ctx: CanvasRenderingContext2D;
  private bg: THREE.Color;
  private t = 0;
  private k = 0;
  private intro: { from: number; to: number; ms: number; delay: number; at: number; done?: () => void } | null = null;
  private cur: ViewTargets = { fx: 0.5, fy: 0.5, fill: 0.7 };
  private target: ViewTargets = { fx: 0.5, fy: 0.5, fill: 0.7 };
  private px = 0;
  private py = 0;
  private dirty = true;
  private w = 0;
  private h = 0;
  private ro: ResizeObserver | null;
  private io: IntersectionObserver | null;

  constructor(
    private engine: Engine,
    readonly canvas: HTMLCanvasElement,
    readonly cfg: ViewConfig,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.bg = new THREE.Color(cfg.vibe.background);
    const ctx = { vibe: cfg.vibe, light: cfg.light, glow: engine.glow };
    this.world = cfg.intro ? buildIntro(cfg.kind, ctx) : buildWorld(cfg.kind, ctx);
    this.scene.add(this.world.root);
    this.scene.environment = engine.env;
    this.scene.environmentIntensity = cfg.light ? 0.55 : 0.4;
    this.scene.fog = cfg.intro ? null : new THREE.Fog(this.bg, 10, 30);
    const hemi = new THREE.HemisphereLight(0xffffff, this.bg, cfg.light ? 1.6 : 1.1);
    const key = new THREE.DirectionalLight(0xffffff, cfg.light ? 2 : 2.4);
    key.position.set(4, 7, 5);
    const rim = new THREE.DirectionalLight(new THREE.Color(cfg.vibe.accent2), cfg.light ? 0.8 : 1.6);
    rim.position.set(-6, 2, -5);
    this.scene.add(hemi, key, rim);

    if (cfg.reduced) {
      this.t = STILL;
      this.k = 1;
    }

    this.ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(([e]) => {
            this.w = e.contentRect.width;
            this.h = e.contentRect.height;
            this.dirty = true;
            this.engine.kick();
          })
        : null;
    this.ro?.observe(canvas);
    const r = canvas.getBoundingClientRect();
    this.w = r.width;
    this.h = r.height;
    this.io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(([e]) => {
            this.onScreen = e.isIntersecting;
            if (this.onScreen) {
              this.dirty = true;
              this.engine.kick();
            }
          })
        : null;
    this.io?.observe(canvas);
    engine.views.add(this);
    engine.kick();
  }

  setTargets(t: Partial<ViewTargets>, instant = false) {
    Object.assign(this.target, t);
    if (instant || this.cfg.reduced) Object.assign(this.cur, this.target);
    this.dirty = true;
    this.engine.kick();
  }


  /** Assemble (to 1) or scatter (to 0) over `ms`. */
  animateIntro(to: number, ms: number, delay = 0, done?: () => void) {
    if (this.cfg.reduced) {
      this.k = to === 0 ? 1 : to;
      this.dirty = true;
      this.engine.kick();
      done?.();
      return;
    }
    this.intro = { from: this.k, to, ms, delay, at: 0, done };
    this.engine.kick();
  }

  nudge() {
    this.dirty = true;
  }

  /** Only the world in focus follows the pointer, so moving the mouse redraws one view, not six. */
  setInteractive(on: boolean) {
    this.cfg.interactive = on;
    if (!on) {
      this.px = 0;
      this.py = 0;
      this.dirty = true;
      this.engine.kick();
    }
  }

  step(dt: number): boolean {
    let busy = this.dirty;
    this.dirty = false;
    if (this.intro) {
      const it = this.intro;
      it.at += dt * 1000;
      const p = Math.min(1, Math.max(0, (it.at - it.delay) / it.ms));
      this.k = it.from + (it.to - it.from) * p;
      if (p >= 1) {
        this.intro = null;
        it.done?.();
      }
      busy = true;
    }
    if (!this.cfg.reduced) {
      this.t += dt;
      busy = true;
    }
    const a = 1 - Math.exp(-dt * 5);
    for (const key of ['fx', 'fy', 'fill'] as const) {
      const d = this.target[key] - this.cur[key];
      if (Math.abs(d) > 1e-4) {
        this.cur[key] += d * a;
        busy = true;
      }
    }
    if (this.cfg.interactive && !this.cfg.reduced && this.engine.pointer.seen) {
      const r = this.canvas.getBoundingClientRect();
      const tx = Math.max(-1, Math.min(1, ((this.engine.pointer.x - r.left) / Math.max(1, r.width)) * 2 - 1));
      const ty = Math.max(-1, Math.min(1, ((this.engine.pointer.y - r.top) / Math.max(1, r.height)) * 2 - 1));
      const b = 1 - Math.exp(-dt * 3);
      if (Math.abs(tx - this.px) + Math.abs(ty - this.py) > 2e-3) {
        this.px += (tx - this.px) * b;
        this.py += (ty - this.py) * b;
        busy = true;
      }
    }
    return busy;
  }

  render() {
    const { w, h } = this;
    if (w < 2 || h < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.cfg.full ? 1.5 : 2);
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    const eng = this.engine;
    eng.ensure(pw, ph);

    const wd = this.world;
    this.world.update(this.t, this.k);

    // Fit the world's sphere to `fill` of the shorter side, then swing in as
    // it assembles: farther out and turned a little while k is low.
    const { fx, fy, fill } = this.cur;
    const half = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const fit = (wd.radius * h) / (Math.max(0.05, fill) * Math.min(w, h) * half);
    // Intros run their own timeline on k, so only worlds swoop in with it.
    const swoop = wd.swoop === false ? 0 : 1 - easeOutCubic(this.k);
    const dist = fit * (1 + swoop * 1.1) * (wd.dolly ?? 1);
    const az = wd.azimuth + this.px * 0.32 + swoop * 0.9;
    const el = Math.max(-0.2, Math.min(1.2, wd.elevation - this.py * 0.14 + swoop * 0.25));
    const cam = this.camera;
    cam.position.set(dist * Math.cos(el) * Math.sin(az), wd.centerY + dist * Math.sin(el), dist * Math.cos(el) * Math.cos(az));
    cam.lookAt(0, wd.centerY, 0);
    cam.aspect = w / h;
    cam.near = Math.max(0.1, dist - wd.radius * 6);
    cam.far = dist + 40;
    cam.setViewOffset(w, h, (0.5 - fx) * w, (0.5 - fy) * h, w, h);
    cam.updateProjectionMatrix();
    const shake = wd.shake ?? 0;
    if (shake > 0) {
      cam.position.x += Math.sin(this.t * 71) * shake;
      cam.position.y += Math.sin(this.t * 53 + 1) * shake;
      cam.updateMatrixWorld();
    }
    const fog = this.scene.fog as THREE.Fog | null;
    if (fog) {
      fog.near = dist - wd.radius * 0.2;
      fog.far = dist + wd.radius * 3;
    }

    const scale = ph / eng.bufH;
    for (const m of wd.points) m.size = (m.userData.base as number) * scale;

    const r = eng.renderer;
    r.setViewport(0, 0, pw, ph);
    r.setScissor(0, 0, pw, ph);
    r.setClearColor(this.bg, this.cfg.intro ? 0 : 1);
    r.render(this.scene, cam);
    // WebGL's origin is bottom-left; the copy reads the matching rows.
    this.ctx.clearRect(0, 0, pw, ph);
    this.ctx.drawImage(r.domElement, 0, eng.bufH - ph, pw, ph, 0, 0, pw, ph);
  }

  dispose() {
    this.engine.views.delete(this);
    this.ro?.disconnect();
    this.io?.disconnect();
    this.world.dispose();
    this.engine.kick(); // Panels resume if a full-screen world just closed.
  }
}

/** A world drawn into `canvas`, or null where WebGL is unavailable. */
export function createView(canvas: HTMLCanvasElement, cfg: ViewConfig): WorldView | null {
  const e = getEngine();
  if (!e) return null;
  try {
    return new WorldView(e, canvas, cfg);
  } catch {
    return null;
  }
}
