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
  heroFadeStart: 0.055,
  heroFadeEnd: 0.13,
  emergeStart: 0.125,
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
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

interface Particle {
  hx: number; hy: number;       // grid home
  sx: number; sy: number;       // spawn origin (off bottom-left)
  swx: number; swy: number;     // swirl formation target
  swt: number;                  // position along the spiral (for gradient)
  delay: number; tint: number; depth: number;
  inD1: boolean; inD2: boolean; stag1: number; stag2: number;
  orbitA: number; orbitR: number; // for guardian cells that lift into orbit
}

interface World {
  parts: Particle[];
  cardW: number; cardH: number;
  orbitCX: number; orbitCY: number;
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

  // Swirl formation frame: centered, slightly above middle.
  const L = Math.min(w, h) * 0.6;
  const sx0 = w / 2 - L / 2;
  const sy0 = h / 2 - L / 2 - h * 0.02;
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
    const off = (rand() - 0.5) * 0.11;

    parts.push({
      hx: (c + 0.5) * cellW,
      hy: (r + 0.5) * cellH,
      sx: -w * 0.08 - rand() * w * 0.45,
      sy: h * 1.05 + rand() * h * 0.6,
      swx: sx0 + ((px + off * 30) / 200) * L,
      swy: sy0 + ((py + off * 30) / 200) * L,
      swt: t,
      delay: rand(),
      tint: rand(),
      depth: 0.75 + rand() * 0.5,
      inD1,
      inD2,
      stag1: m ? Math.hypot(m[0] - d1cx, m[1] - d1cy) / maxD1 : 1,
      stag2: m ? Math.hypot(m[0] - d2cx, m[1] - d2cy) / maxD1 : 1,
      orbitA: rand() * Math.PI * 2,
      orbitR: Math.min(w, h) * (0.2 + rand() * 0.16),
    });
  }
  return { parts, cardW, cardH, orbitCX, orbitCY, w, h };
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  world: World,
  p: number,
  time: number,
) {
  const { parts, cardW, cardH, orbitCX, orbitCY, w, h } = world;
  ctx.clearRect(0, 0, w, h);

  if (p < SC.emergeStart - 0.02) return;

  const form1 = sub(p, SC.form1Start, SC.form1End);
  const morph = easeInOut(sub(p, SC.morphStart, SC.morphEnd));
  const release = sub(p, SC.releaseStart, SC.releaseEnd);
  const finale = easeInOut(sub(p, SC.finaleStart, SC.finaleEnd));
  const inFormation = form1 > 0 && release < 1;
  const pulse = finale >= 1 ? 1 + Math.sin(time * 0.9) * 0.025 : 1;

  for (let i = 0; i < parts.length; i++) {
    const pt = parts[i];

    // — emergence: ride the current from bottom-left to the grid home
    const q = clamp01(sub(p, SC.emergeStart, SC.settleEnd) * 1.45 - pt.delay * 0.45);
    if (q <= 0 && finale <= 0) continue;
    const e = easeOutCubic(q);
    const dx = pt.hx - pt.sx;
    const dy = pt.hy - pt.sy;
    const len = Math.hypot(dx, dy) || 1;
    const wave = Math.sin(q * 5.5 + pt.delay * 6.28) * 60 * pt.depth * (1 - e);
    let x = pt.sx + dx * e + (dy / len) * wave;
    let y = pt.sy + dy * e - (dx / len) * wave;
    let rot = (1 - e) * (-0.48 + pt.delay * 0.3);
    let op = Math.min(1, q * 4) * (0.5 + 0.42 * Math.min(pt.depth, 1));

    // — flips: The First Desk, then the morph to The Desk Becomes Yours.
    // Only some of the guardian's cards lift into orbit; the rest return to
    // the field in place, so the vacated region reads as a soft absence.
    let flip = 0;
    const isOrbiter = pt.inD1 && !pt.inD2 && pt.delay > 0.45;
    if (pt.inD1 && form1 > 0) flip = clamp01(form1 * 1.9 - pt.stag1 * 0.7);
    if (morph > 0) {
      if (pt.inD2) flip = Math.max(flip, clamp01(morph * 1.9 - pt.stag2 * 0.7));
      else flip = flip * (1 - morph);
    }

    // guardian cells lift out of the grid and orbit the learner
    if (isOrbiter && morph > 0 && finale < 1) {
      const a = pt.orbitA + time * 0.28 + morph * 1.6;
      const orbR = pt.orbitR * (0.55 + 0.45 * morph);
      const ox = orbitCX + Math.cos(a) * orbR;
      const oy = orbitCY + Math.sin(a) * orbR * 0.62;
      x = x + (ox - x) * morph;
      y = y + (oy - y) * morph;
    }

    // dim the field so the formed image reads
    if (inFormation && !isOrbiter) {
      const imgNow = morph > 0.5 ? pt.inD2 : pt.inD1;
      const dimT = Math.max(form1, morph) * (1 - release);
      if (!imgNow && dimT > 0) op *= 1 - 0.6 * dimT;
    }

    // — release into the quiet background band behind S6/S7
    if (release > 0) {
      flip *= 1 - release;
      op *= 1 - release * (isOrbiter ? 0.55 : 0.87);
    }
    if (q >= 1 && release >= 1 && finale <= 0) {
      x += Math.sin(time * 0.4 + i * 1.7) * 2.2;
      y += Math.cos(time * 0.33 + i * 2.3) * 1.8;
    }

    // — finale: everything streams into the swirl
    let tint = pt.tint;
    if (finale > 0) {
      x += (pt.swx - x) * finale;
      y += (pt.swy - y) * finale;
      op = op + (0.95 - op) * finale;
      flip *= 1 - finale;
      rot *= 1 - finale;
      tint = pt.tint + (pt.swt - pt.tint) * finale;
    }
    if (op <= 0.01) continue;

    const fl = Math.abs(1 - 2 * flip);
    const flipped = flip > 0.5;
    const s = pt.depth * pulse;
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
    range: [0.17, 0.3],
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
    drawFrame(ctx, world, (SC.form1End + SC.morphStart) / 2, 0);
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
    const cv = canvasRef.current;
    if (!root || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let world: World | null = null;
    let raf = 0;
    let running = true;
    let visible = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      world = buildWorld(w, h);
    };
    resize();
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
      const p = clamp01(-rect.top / (rect.height - window.innerHeight));
      const t = performance.now() / 1000;

      drawFrame(ctx, world, p, t);

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
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
      io.disconnect();
    };
  }, [reduced]);

  if (reduced) return <StaticStory />;

  return (
    <div ref={rootRef} className="relative h-[640vh] md:h-[880vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        <AmbientGlow />
        <canvas ref={canvasRef} className="absolute inset-0" aria-hidden />

        {/* S0/S1 hero */}
        <div ref={heroRef} className="absolute inset-0 z-10 flex items-center justify-center">
          <div ref={wordRef} className="transition-none">
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
