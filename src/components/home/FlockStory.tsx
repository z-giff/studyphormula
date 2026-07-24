import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SwirlMark from "@/components/SwirlMark";
import { FileText, Layers, GitBranch, Signature } from "lucide-react";
import { MemorizeIcon, SwipeIcon, QuizIcon } from "@/components/StudyModeIcons";
import {
  MASK_FIRST_DESK,
  MASK_YOUR_DESK,
  MASK_COLS,
  MASK_ROWS,
  SPIRAL_POINTS,
  INK_FACE,
  INK_EDGE,
  CANVAS_BG,
  emberColor,
} from "./flockData";

/**
 * The Scene 0–9 homepage narrative. One continuous scroll story:
 *
 *   S0 arrival · S1 exhale · S2 flock emerges · S3 the field settles ·
 *   S4 formation "The First Desk" · S5 morph "The Desk Becomes Yours" ·
 *   S6 four kinds of cards / three ways to study · S7 mission ·
 *   S8 the swirl + call to action. (S9, the footer, follows in normal flow.)
 *
 * All cinematic motion is a pure function of scroll progress — native scroll
 * is never hijacked, and any offset resumes correctly. Reduced-motion
 * visitors get a static, stacked version of the same story.
 */

// Scene ranges as fractions of the scroll container.
const SC = {
  // The flock begins filling the viewport almost immediately, behind a still
  // fully-visible hero, so the opening reads as one immersive full-screen
  // composition; the hero then exhales out once the field has arrived.
  heroFadeStart: 0.14,
  heroFadeEnd: 0.26,
  emergeStart: 0.02,
  settleEnd: 0.36,
  form1Start: 0.395,
  form1End: 0.48,
  morphStart: 0.52,
  morphEnd: 0.6,
  releaseStart: 0.62,
  releaseEnd: 0.665,
  finaleStart: 0.88,
  finaleEnd: 0.965,
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const sub = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

interface Particle {
  hx: number; hy: number;       // grid home
  sctX: number; sctY: number;   // scatter offset from home (settles to 0)
  swx: number; swy: number;     // swirl formation target
  swt: number;                  // position along the spiral (for gradient)
  homeAng: number;              // angle centre → home (exit + gather direction)
  distC: number;                // normalised distance of home from centre (0..1)
  delay: number; tint: number; depth: number;
  inD1: boolean; inD2: boolean; stag1: number; stag2: number;
  orbitA: number; orbitR: number; // for guardian cells that lift into orbit
}

interface World {
  parts: Particle[];
  cardW: number; cardH: number;
  orbitCX: number; orbitCY: number;
  cxF: number; cyF: number;     // composition centre (logo centre)
  w: number; h: number;
}

function buildWorld(w: number, h: number): World {
  const pitch = w < 640 ? 22 : 27;
  const cols = Math.max(24, Math.min(60, Math.round(w / pitch)));
  const rows = Math.max(14, Math.min(32, Math.round(h / pitch)));
  const cellW = w / cols;
  const cellH = h / rows;
  const cardW = cellW * 0.66;
  const cardH = Math.min(cellH * 0.6, cardW * 0.68);

  // Formation region: a centered mask-aspect window inside the grid so the
  // silhouettes never distort on tall viewports.
  let rc = cols;
  let rr = Math.round((cols * MASK_ROWS) / MASK_COLS / (cellH / cellW));
  if (rr > rows) {
    rr = rows;
    rc = Math.round((rows * MASK_COLS) / MASK_ROWS * (cellH / cellW));
  }
  const c0 = Math.floor((cols - rc) / 2);
  const r0 = Math.floor((rows - rr) / 2);
  const maskCoord = (c: number, r: number): [number, number] | null => {
    if (c < c0 || r < r0) return null;
    const mc = Math.floor(((c - c0) / rc) * MASK_COLS);
    const mr = Math.floor(((r - r0) / rr) * MASK_ROWS);
    if (mc >= MASK_COLS || mr >= MASK_ROWS) return null;
    return [mc, mr];
  };
  const inMask = (mask: string[], c: number, r: number) => {
    const m = maskCoord(c, r);
    return m ? mask[m[1]][m[0]] === "#" : false;
  };

  // Mask centroids (for radial flip stagger) and the learner figure centre
  // (orbit anchor) in world coordinates.
  const centroid = (mask: string[], figureOnly = false) => {
    let sx = 0, sy = 0, n = 0;
    for (let r = 0; r < MASK_ROWS; r++)
      for (let c = 0; c < MASK_COLS; c++)
        if (mask[r][c] === "#" && (!figureOnly || (r < 17 && c < 31))) {
          sx += c; sy += r; n++;
        }
    return n ? [sx / n, sy / n] : [MASK_COLS / 2, MASK_ROWS / 2];
  };
  const [d1cx, d1cy] = centroid(MASK_FIRST_DESK);
  const [d2cx, d2cy] = centroid(MASK_YOUR_DESK);
  const [figCx, figCy] = centroid(MASK_YOUR_DESK, true);
  const maskToWorld = (mc: number, mr: number): [number, number] => [
    (c0 + ((mc + 0.5) / MASK_COLS) * rc + 0.5) * cellW,
    (r0 + ((mr + 0.5) / MASK_ROWS) * rr + 0.5) * cellH,
  ];
  const [orbitCX, orbitCY] = maskToWorld(figCx, figCy);

  // Composition centre — the logo sits slightly above the middle; the flock
  // blooms out from here, exits back through here, and gathers into the swirl
  // here, so every phase stays centred and balanced.
  const cxF = w / 2;
  const cyF = h * 0.46;
  const halfDiag = Math.hypot(w / 2, h / 2);

  // Swirl formation frame: centred, slightly above middle.
  const L = Math.min(w, h) * 0.62;
  const sx0 = cxF - L / 2;
  const sy0 = cyF - L / 2;
  const maxD1 = Math.hypot(MASK_COLS, MASK_ROWS) / 2;

  const parts: Particle[] = [];
  const N = cols * rows;
  let seed = 7;
  const rand = () => {
    // deterministic LCG so rebuilds on resize don't reshuffle the story
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let i = 0; i < N; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const m = maskCoord(c, r);
    const inD1 = inMask(MASK_FIRST_DESK, c, r);
    const inD2 = inMask(MASK_YOUR_DESK, c, r);
    const t = ((i * 0.618034) % 1 + rand() * 0.01) % 1;
    const idxF = t * (SPIRAL_POINTS.length - 1);
    const i0 = Math.floor(idxF);
    const fr = idxF - i0;
    const p0 = SPIRAL_POINTS[i0];
    const p1 = SPIRAL_POINTS[Math.min(i0 + 1, SPIRAL_POINTS.length - 1)];
    const px = p0[0] + (p1[0] - p0[0]) * fr;
    const py = p0[1] + (p1[1] - p0[1]) * fr;
    const off = (rand() - 0.5) * 0.06;

    const hx = (c + 0.5) * cellW;
    const hy = (r + 0.5) * cellH;
    // Scatter offset: cards fade in scattered a few cells from home across the
    // whole viewport, then settle onto the grid — "a thousand scattered pieces"
    // that fill the full screen from the moment they arrive.
    const sctX = (rand() - 0.5) * cellW * 3.4;
    const sctY = (rand() - 0.5) * cellH * 3.4;

    parts.push({
      hx, hy, sctX, sctY,
      homeAng: Math.atan2(hy - cyF, hx - cxF),
      distC: Math.min(1, Math.hypot(hx - cxF, hy - cyF) / halfDiag),
      swx: sx0 + ((px + off * 30) / 200) * L,
      swy: sy0 + ((py + off * 30) / 200) * L,
      swt: t,
      delay: rand(),
      tint: rand(),
      depth: 0.78 + rand() * 0.44,
      inD1,
      inD2,
      stag1: m ? Math.hypot(m[0] - d1cx, m[1] - d1cy) / maxD1 : 1,
      stag2: m ? Math.hypot(m[0] - d2cx, m[1] - d2cy) / maxD1 : 1,
      orbitA: rand() * Math.PI * 2,
      orbitR: Math.min(w, h) * (0.2 + rand() * 0.16),
    });
  }
  return { parts, cardW, cardH, orbitCX, orbitCY, cxF, cyF, w, h };
}

/**
 * Renders one frame as a pure function of scroll progress `p` — no clock.
 * The picture is fully determined by scroll position, so motion pauses the
 * instant scrolling stops and scrubs identically forwards and backwards.
 */
function drawFrame(ctx: CanvasRenderingContext2D, world: World, p: number) {
  const { parts, cardW, cardH, orbitCX, orbitCY, cxF, cyF, w, h } = world;
  ctx.clearRect(0, 0, w, h);

  if (p < SC.emergeStart - 0.02) return;

  const form1 = sub(p, SC.form1Start, SC.form1End);
  const morph = easeInOut(sub(p, SC.morphStart, SC.morphEnd));
  const release = sub(p, SC.releaseStart, SC.releaseEnd);
  const finaleRaw = sub(p, SC.finaleStart, SC.finaleEnd);
  const finale = easeInOut(finaleRaw);
  const inFormation = form1 > 0 && release < 1;
  // Off-screen radius the flock exits to and gathers back in from.
  const ringR = Math.hypot(w, h) * 0.62;

  // Between the field's exit (releaseEnd) and the finale, the canvas is
  // intentionally empty — no lingering cards behind the feature/mission text.
  const fieldGone = release >= 1 && finaleRaw <= 0;
  if (fieldGone) return;

  for (let i = 0; i < parts.length; i++) {
    const pt = parts[i];
    let x: number, y: number, op: number, rot = 0, flip = 0;
    let tint = pt.tint;
    const base = 0.55 + 0.4 * Math.min(pt.depth, 1);

    if (finaleRaw > 0) {
      // — S8 finale: gather inward from an off-screen ring into the swirl.
      const g = easeOutCubic(finale);
      const rx = cxF + Math.cos(pt.homeAng) * ringR;
      const ry = cyF + Math.sin(pt.homeAng) * ringR;
      x = rx + (pt.swx - rx) * g;
      y = ry + (pt.swy - ry) * g;
      op = clamp01(finale * 1.6) * base;
      rot = (1 - g) * (-0.4 + pt.delay * 0.8);
      tint = pt.tint + (pt.swt - pt.tint) * finale;
    } else {
      // — S2/S3 emergence: cards fade in scattered across the whole viewport
      // (near their grid homes) and settle onto the grid. Staggered mostly at
      // random with only a gentle centre-out bias, so the entire screen fills
      // quickly and evenly rather than growing from a centre blob.
      const emerge = sub(p, SC.emergeStart, SC.settleEnd);
      const q = clamp01(emerge * 2.4 - pt.delay * 0.85 - pt.distC * 0.18);
      if (q <= 0) continue;
      const e = easeOutCubic(q);
      const wob = 1 - e;
      x = pt.hx + pt.sctX * wob + Math.sin(e * 6 + pt.delay * 6.28) * 14 * pt.depth * wob;
      y = pt.hy + pt.sctY * wob + Math.cos(e * 5 + pt.delay * 6.28) * 14 * pt.depth * wob;
      rot = wob * (-0.4 + pt.delay * 0.8);
      op = clamp01(q * 1.6) * base;

      // — S4/S5 formations: flip image cards to ink; dim the rest.
      const isOrbiter = pt.inD1 && !pt.inD2 && pt.delay > 0.45;
      if (pt.inD1 && form1 > 0) flip = clamp01(form1 * 1.9 - pt.stag1 * 0.7);
      if (morph > 0) {
        if (pt.inD2) flip = Math.max(flip, clamp01(morph * 1.9 - pt.stag2 * 0.7));
        else flip = flip * (1 - morph);
      }
      if (isOrbiter && morph > 0) {
        const a = pt.orbitA + morph * 1.6 + Math.max(0, p - SC.morphEnd) * 11;
        const orbR = pt.orbitR * (0.55 + 0.45 * morph);
        x += (orbitCX + Math.cos(a) * orbR - x) * morph;
        y += (orbitCY + Math.sin(a) * orbR * 0.62 - y) * morph;
      }
      if (inFormation && !isOrbiter) {
        const imgNow = morph > 0.5 ? pt.inD2 : pt.inD1;
        const dimT = Math.max(form1, morph) * (1 - release);
        if (!imgNow && dimT > 0) op *= 1 - 0.6 * dimT;
      }

      // — release: fly outward through the centre-axis and fade fully, so the
      // stage is completely clear for the feature/mission scenes.
      if (release > 0) {
        const push = easeInCubic(release) * ringR;
        x += Math.cos(pt.homeAng) * push;
        y += Math.sin(pt.homeAng) * push;
        op *= 1 - release;
        flip *= 1 - release;
      }
    }

    if (op <= 0.01) continue;

    const fl = Math.abs(1 - 2 * flip);
    const flipped = flip > 0.5;
    const s = pt.depth;
    const cw = cardW * s * fl;
    const chh = cardH * s;

    ctx.globalAlpha = op;
    if (rot !== 0) {
      ctx.setTransform(1, 0, 0, 1, x, y);
      ctx.rotate(rot);
      ctx.translate(-x, -y);
    }
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x - cw / 2, y - chh / 2, cw, chh, 3);
    } else {
      ctx.rect(x - cw / 2, y - chh / 2, cw, chh);
    }
    if (flipped) {
      ctx.fillStyle = INK_FACE;
      ctx.fill();
      ctx.strokeStyle = INK_EDGE;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillStyle = emberColor(tint);
      ctx.fill();
    }
    if (rot !== 0) ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  ctx.globalAlpha = 1;
}

/** Overlay visibility: fade in over the head of a range, out over its tail. */
const fade = (p: number, a: number, b: number, holdEnd = false) => {
  if (p < a || (!holdEnd && p > b)) return 0;
  const inLen = (b - a) * 0.22;
  const outLen = (b - a) * 0.18;
  if (p < a + inLen) return (p - a) / inLen;
  if (!holdEnd && p > b - outLen) return (b - p) / outLen;
  return 1;
};

const CAPTIONS: {
  id: string;
  text: string;
  range: [number, number];
  className: string;
}[] = [
  {
    id: "cap2",
    text: "Every subject starts as a thousand scattered pieces.",
    range: [0.26, 0.325],
    className: "right-[6%] top-[30%] max-w-xs text-right md:max-w-sm",
  },
  {
    id: "cap3",
    text: "Alone, they’re just cards.",
    range: [0.31, 0.385],
    className: "left-1/2 top-[44%] w-full max-w-md -translate-x-1/2 text-center",
  },
  {
    id: "cap4",
    text: "We all started with someone beside us.",
    range: [0.41, 0.5],
    className: "right-[6%] top-[26%] max-w-xs text-right",
  },
  {
    id: "cap5",
    text: "Then one day the desk is yours.\nPhormula sits with you.",
    range: [0.53, 0.615],
    className: "left-[6%] top-[26%] max-w-xs",
  },
];

const FLASHCARD_TYPES = [
  { icon: FileText, name: "Standard", line: "Flip it till it sticks." },
  { icon: Layers, name: "Interactive", line: "Label the image from memory." },
  { icon: GitBranch, name: "Flowchart", line: "See how it connects." },
  { icon: Signature, name: "Drawing", line: "Sketch it to remember it." },
];

const STUDY_MODES = [
  { icon: MemorizeIcon, name: "Memorize" },
  { icon: SwipeIcon, name: "Swipe Study" },
  { icon: QuizIcon, name: "MC Quiz" },
];

const HeroLockup = ({ animated }: { animated: boolean }) => (
  <div className="flex flex-col items-center px-6 text-center">
    <SwirlMark drawOn={animated} className="mb-5 h-24 w-24 drop-shadow-[0_0_28px_rgba(242,121,95,0.25)] sm:h-28 sm:w-28" />
    <h1 className="font-display text-6xl font-medium tracking-tight text-foreground sm:text-7xl">
      Phormula
    </h1>
    <p className="mt-3 font-display text-lg italic text-muted-foreground sm:text-xl">
      Reformulating your study methods.
    </p>
    <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
      <Button asChild variant="brand" size="lg" className="rounded-xl px-7 font-bold">
        <Link to="/auth?mode=signup">Start studying</Link>
      </Button>
      <Button asChild variant="outline" size="lg" className="rounded-xl border-line-strong bg-transparent px-7 hover:bg-accent">
        <Link to="/auth?mode=signin">Sign in</Link>
      </Button>
    </div>
  </div>
);

const AmbientGlow = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="animate-breathe absolute -left-[12%] -top-[8%] h-[52vw] w-[52vw] rounded-full opacity-30 blur-3xl [background:radial-gradient(circle,hsl(340_35%_16%)_0%,transparent_65%)]" />
    <div className="animate-breathe absolute -bottom-[6%] -right-[10%] h-[44vw] w-[44vw] rounded-full opacity-30 blur-3xl [background:radial-gradient(circle,hsl(266_30%_15%)_0%,transparent_65%)] [animation-delay:-4s] [animation-duration:12s]" />
  </div>
);

const FeatureBlock = () => (
  <div className="mx-auto w-full max-w-4xl px-6">
    <h2 className="font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
      Four kinds of cards.
    </h2>
    <div className="mt-7 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
      {FLASHCARD_TYPES.map((f) => (
        <div key={f.name} className="flex items-center gap-4 rounded-2xl border border-border bg-card/80 p-5 backdrop-blur-sm">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line-strong bg-secondary text-muted-foreground">
            <f.icon className="h-5 w-5" strokeWidth={1.7} />
          </span>
          <div>
            <div className="font-semibold text-foreground">{f.name}</div>
            <div className="text-sm text-muted-foreground">{f.line}</div>
          </div>
        </div>
      ))}
    </div>
    <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
      <span className="font-display text-lg italic text-muted-foreground">…then study them three ways:</span>
      {STUDY_MODES.map((m) => (
        <span key={m.name} className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          <m.icon className="h-[18px] w-[18px] text-primary" />
          {m.name}
        </span>
      ))}
    </div>
  </div>
);

const MissionBlock = () => (
  <div className="mx-auto w-full max-w-xl px-6 text-center">
    <p className="font-display text-2xl font-light leading-relaxed text-foreground sm:text-[1.7rem]">
      We believe memorization isn&rsquo;t the enemy of understanding —
      it&rsquo;s the foundation of it. Phormula exists to make the hours you
      put in actually count.
    </p>
    <p className="mt-6 font-handwriting text-3xl text-brand-amber">— the Phormula team</p>
  </div>
);

const FinaleBlock = () => (
  <div className="mx-auto w-full px-6 text-center">
    <h2 className="font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
      Make it make sense.
    </h2>
    <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
      <Button asChild variant="brand" size="lg" className="rounded-xl px-8 font-bold">
        <Link to="/auth?mode=signup">Start studying — it&rsquo;s free</Link>
      </Button>
      <Button asChild variant="outline" size="lg" className="rounded-xl border-line-strong bg-transparent px-7 hover:bg-accent">
        <Link to="/auth?mode=signin">Sign in</Link>
      </Button>
    </div>
  </div>
);

/** Static version of the story for reduced-motion visitors. */
const StaticStory = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const w = (cv.width = cv.clientWidth);
    const h = (cv.height = Math.round(cv.clientWidth * 0.54));
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, w, h);
    const world = buildWorld(w, h);
    // composed frame of the First Desk formation
    drawFrame(ctx, world, (SC.form1End + SC.morphStart) / 2);
  }, []);
  return (
    <div className="relative">
      <AmbientGlow />
      <div className="relative flex min-h-[92vh] flex-col items-center justify-center py-24">
        <HeroLockup animated={false} />
      </div>
      <div className="mx-auto max-w-3xl space-y-6 px-6 text-center">
        {CAPTIONS.map((c) => (
          <p key={c.id} className="font-display text-2xl italic text-muted-foreground">
            {c.text.split("\n").map((l) => (
              <span key={l} className="block">{l}</span>
            ))}
          </p>
        ))}
      </div>
      <div className="mx-auto mt-12 max-w-4xl px-6">
        <canvas ref={canvasRef} className="w-full rounded-2xl border border-border" aria-hidden />
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Thousands of cards organize into a picture — the First Desk.
        </p>
      </div>
      <div className="py-20"><FeatureBlock /></div>
      <div className="py-16"><MissionBlock /></div>
      <div className="py-20"><FinaleBlock /></div>
    </div>
  );
};

const FlockStory = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const overlayRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const root = rootRef.current;
    const stage = stageRef.current;
    const cv = canvasRef.current;
    if (!root || !stage || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let world: World | null = null;
    let raf = 0;
    let running = true;
    let visible = true;
    let lastP = -1; // last drawn scroll progress (declared before resize uses it)
    let cw = 0, ch = 0; // last measured stage size

    // Size the canvas from the stage element's *measured* box (never from
    // window.innerWidth/innerHeight, which can differ from the rendered size
    // inside embeds/iframes or before first layout). This guarantees a
    // seamless full-bleed fill and a drawing space that matches what's shown.
    const resize = () => {
      const rect = stage.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w <= 0 || h <= 0) return;
      if (w === cw && h === ch) return; // no real change
      cw = w; ch = h;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      world = buildWorld(w, h);
      lastP = -1; // force a redraw at the new size
    };
    resize();
    // ResizeObserver catches every layout change of the stage — panel drags,
    // iframe resizes, device-frame toggles — that a window 'resize' misses.
    const ro = new ResizeObserver(() => resize());
    ro.observe(stage);
    window.addEventListener("resize", resize);

    const setOverlay = (id: string, op: number, ty = 14, interactive = false) => {
      const el = overlayRefs.current[id];
      if (!el) return;
      el.style.opacity = String(op);
      el.style.transform = `translateY(${(1 - op) * ty}px)`;
      el.style.pointerEvents = interactive && op > 0.5 ? "auto" : "none";
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!running || !visible || !world) return;
      const rect = root.getBoundingClientRect();
      // Use the measured stage height so scroll progress is correct inside
      // embeds where window.innerHeight may not equal the rendered viewport.
      const p = clamp01(-rect.top / (rect.height - (ch || window.innerHeight)));
      // Everything on screen is a pure function of p — when the scroll
      // position hasn't moved, skip the frame entirely so all motion
      // pauses the instant scrolling stops.
      if (Math.abs(p - lastP) < 0.00004) return;
      lastP = p;

      drawFrame(ctx, world, p);

      // S0/S1 — the hero exhales as you scroll into the story
      const hero = heroRef.current;
      if (hero) {
        const ex = sub(p, SC.heroFadeStart, SC.heroFadeEnd);
        const op = 1 - ex;
        hero.style.opacity = String(op);
        hero.style.transform = `translateY(${-ex * 60}px) scale(${1 + ex * 0.35})`;
        hero.style.filter = ex > 0 ? `blur(${ex * 7}px)` : "none";
        hero.style.pointerEvents = op > 0.6 ? "auto" : "none";
        const word = wordRef.current?.querySelector("h1");
        if (word) word.style.letterSpacing = ex > 0 ? `${ex * 0.28}em` : "";
      }
      if (scrollHintRef.current) {
        scrollHintRef.current.style.opacity = String(1 - sub(p, 0.012, 0.05));
      }

      for (const c of CAPTIONS) setOverlay(c.id, fade(p, c.range[0], c.range[1]));
      setOverlay("features", fade(p, 0.665, 0.78), 22, true);
      setOverlay("proof", fade(p, 0.79, 0.875), 22);
      setOverlay("finale", fade(p, 0.9, 1, true), 22, true);
    };

    const io = new IntersectionObserver(
      (entries) => { visible = entries[0]?.isIntersecting ?? true; },
      { threshold: 0 },
    );
    io.observe(root);
    const onVis = () => { running = document.visibilityState === "visible"; };
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
      io.disconnect();
    };
  }, [reduced]);

  if (reduced) return <StaticStory />;

  return (
    <div ref={rootRef} className="relative h-[640vh] md:h-[880vh]">
      <div ref={stageRef} className="sticky top-0 h-screen w-full overflow-hidden">
        <AmbientGlow />
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden />

        {/* S0/S1 hero — a soft radial vignette keeps the lockup legible over
            the flock without any hard edge; it fades out with the hero. */}
        <div ref={heroRef} className="absolute inset-0 z-10 flex items-center justify-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_46%_42%_at_50%_47%,hsl(266_24%_6%/0.92)_0%,hsl(266_24%_6%/0.7)_38%,transparent_72%)]"
          />
          <div ref={wordRef} className="relative transition-none">
            <HeroLockup animated />
          </div>
        </div>
        <div
          ref={scrollHintRef}
          className="absolute bottom-7 left-0 right-0 z-10 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground/70"
          aria-hidden
        >
          scroll
        </div>

        {/* S2–S5 captions, synchronized to their scenes */}
        {CAPTIONS.map((c) => (
          <div
            key={c.id}
            ref={(el) => (overlayRefs.current[c.id] = el)}
            className={`pointer-events-none absolute z-10 font-display text-xl italic leading-snug text-foreground/90 opacity-0 sm:text-2xl ${c.className}`}
          >
            {c.text.split("\n").map((l) => (
              <span key={l} className="block">{l}</span>
            ))}
          </div>
        ))}

        {/* S6 — feature storytelling */}
        <div
          ref={(el) => (overlayRefs.current["features"] = el)}
          className="pointer-events-none absolute inset-0 z-10 flex items-center opacity-0"
        >
          <FeatureBlock />
        </div>

        {/* S7 — mission */}
        <div
          ref={(el) => (overlayRefs.current["proof"] = el)}
          className="pointer-events-none absolute inset-0 z-10 flex items-center opacity-0"
        >
          <MissionBlock />
        </div>

        {/* S8 — the swirl and the ask */}
        <div
          ref={(el) => (overlayRefs.current["finale"] = el)}
          className="pointer-events-none absolute inset-x-0 bottom-[9%] z-10 opacity-0"
        >
          <FinaleBlock />
        </div>
      </div>
    </div>
  );
};

export default FlockStory;
