import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SwirlMark from "@/components/SwirlMark";
import CardTypeShowcase from "./CardTypeShowcase";
import {
  buildWorld,
  drawFrame,
  clamp01,
  seg,
  SCENES,
  type World,
} from "./storyEngine";

/**
 * The homepage story: one continuous, scroll-driven narrative in nine scenes.
 *
 * A single sticky stage holds a full-bleed canvas (the card flock) with the
 * scene copy layered over it. Native scrolling drives everything — no
 * scroll-jacking — and every visual is a pure function of scroll progress, so
 * the story scrubs identically forwards and backwards and pauses the moment
 * scrolling stops.
 */

/* ------------------------------------------------------------------ *
 * Scene content
 * ------------------------------------------------------------------ */

const HeroLockup = ({ animated }: { animated: boolean }) => (
  <div className="flex flex-col items-center px-6 text-center">
    <SwirlMark
      drawOn={animated}
      className="h-24 w-24 drop-shadow-[0_0_28px_rgba(242,121,95,0.25)] sm:h-28 sm:w-28"
    />
    <h1 className="mt-5 font-display text-6xl font-medium tracking-tight text-foreground sm:text-7xl">
      Phormula
    </h1>
    <p className="mt-3 font-display text-lg italic text-muted-foreground sm:text-xl">
      Reformulating your study methods.
    </p>
    <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
      <Button asChild variant="brand" size="lg" className="rounded-xl px-7 font-bold">
        <Link to="/auth?mode=signup">Start studying</Link>
      </Button>
      <Button
        asChild
        variant="outline"
        size="lg"
        className="rounded-xl border-line-strong bg-transparent px-7 hover:bg-accent"
      >
        <Link to="/auth?mode=signin">Sign in</Link>
      </Button>
    </div>
  </div>
);

const ModesBlock = ({ revealed = 4 }: { revealed?: number }) => (
  <CardTypeShowcase revealed={revealed} />
);

/**
 * Founder's note. Deliberately free of statistics, testimonials or user
 * numbers — replace this copy (and add real proof points) when they exist.
 */
const ProofBlock = () => (
  <div className="mx-auto w-full max-w-xl px-6 text-center">
    <p className="font-display text-2xl font-light leading-relaxed text-foreground sm:text-[1.7rem]">
      Phormula began because the way we were expected to study did not match the
      way we learned.
    </p>
    <p className="mt-5 font-display text-xl font-light leading-relaxed text-muted-foreground sm:text-[1.35rem]">
      So we built a place where ideas could be seen, connected, and remembered
      differently.
    </p>
    <p className="mt-6 font-handwriting text-3xl text-brand-amber">— the Phormula team</p>
  </div>
);

const FinaleBlock = ({ drawOn = false }: { drawOn?: boolean }) => (
  <div className="mx-auto flex w-full flex-col items-center px-6 text-center">
    <SwirlMark
      data-finale-swirl
      drawOn={drawOn}
      className="h-28 w-28 drop-shadow-[0_0_30px_rgba(242,121,95,0.22)] sm:h-32 sm:w-32"
    />
    <h2 className="mt-6 font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
      Your way of learning, reformulated.
    </h2>
    <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
      <Button asChild variant="brand" size="lg" className="rounded-xl px-8 font-bold">
        <Link to="/auth?mode=signup">Start studying — it&rsquo;s free</Link>
      </Button>
      <Button
        asChild
        variant="outline"
        size="lg"
        className="rounded-xl border-line-strong bg-transparent px-7 hover:bg-accent"
      >
        <Link to="/auth?mode=signin">Sign in</Link>
      </Button>
    </div>
  </div>
);

/** Scene copy that sits over the flock, each tied to its scroll window. */
const CAPTIONS: { id: string; text: string; range: [number, number]; className: string }[] = [
  {
    id: "capField",
    text: "Every new subject\nbegins as a mess of terms,\ndiagrams, and half-understood\nideas.",
    range: [0.29, 0.355],
    className: "bottom-[11%] left-[6%] max-w-md text-left leading-relaxed",
  },
  {
    id: "capConnect",
    text: "So you break it down—one card,\none concept, one small\nstep at a time.",
    range: [0.4, 0.492],
    className: "bottom-[11%] left-[6%] max-w-md text-left leading-relaxed",
  },
  {
    id: "capOrbit",
    text: "Slowly, the scattered\npieces begin to speak\nto one another.",
    range: [0.537, 0.607],
    className: "bottom-[11%] left-[6%] max-w-md text-left leading-relaxed",
  },
  {
    id: "capNetwork",
    text: "Understanding becomes easier when you can\nfinally see how everything fits together.",
    range: [0.605, 0.648],
    className: "inset-x-0 top-[44%] mx-auto w-full max-w-xl text-center",
  },
];

/** Fade in over the head of a window and out over its tail. */
const fade = (p: number, a: number, b: number, holdEnd = false) => {
  if (p < a || (!holdEnd && p > b)) return 0;
  const inLen = (b - a) * 0.26;
  const outLen = (b - a) * 0.22;
  if (p < a + inLen) return (p - a) / inLen;
  if (!holdEnd && p > b - outLen) return (b - p) / outLen;
  return 1;
};

/* ------------------------------------------------------------------ *
 * Reduced-motion: the same story, told as calm static sections.
 * ------------------------------------------------------------------ */
const StaticStory = () => (
  <div className="bg-background">
    <section className="flex min-h-[100svh] flex-col items-center justify-center py-20">
      <HeroLockup animated={false} />
    </section>
    <section className="mx-auto max-w-2xl space-y-8 px-6 pb-20 text-center">
      {CAPTIONS.map((c) => (
        <p key={c.id} className="font-display text-2xl italic text-muted-foreground">
          {c.text.split("\n").map((l) => (
            <span key={l} className="block">{l}</span>
          ))}
        </p>
      ))}
    </section>
    <section className="py-16"><ModesBlock /></section>
    <section className="py-16"><ProofBlock /></section>
    <section className="py-20"><FinaleBlock /></section>
  </div>
);

/* ------------------------------------------------------------------ *
 * The scroll-driven stage
 * ------------------------------------------------------------------ */
const StoryStage = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const swirlRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [reduced, setReduced] = useState(false);
  // S5 demos play once when the scene arrives, and reset when it leaves so
  // scrubbing back up the page replays them cleanly.
  const [modesRevealed, setModesRevealed] = useState(0);
  const modesRevealedRef = useRef(0);

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
    let visible = true;
    let awake = true;
    let lastP = -1;
    let sw = 0, sh = 0;
    let dpr = 1;

    // Size from the stage's *measured* box (never window.inner*, which differs
    // inside embeds/iframes and before first layout) so the canvas is always a
    // seamless full-bleed fill with a matching drawing space.
    const resize = () => {
      const r = stage.getBoundingClientRect();
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
      if (w <= 0 || h <= 0 || (w === sw && h === sh && nextDpr === dpr)) return;
      sw = w; sh = h; dpr = nextDpr;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      world = buildWorld(w, h);
      lastP = -1;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    window.addEventListener("resize", resize);

    const setLayer = (id: string, op: number, rise = 16, interactive = false) => {
      const el = layerRefs.current[id];
      if (!el) return;
      el.style.opacity = String(op);
      el.style.transform = op >= 1 ? "" : `translateY(${(1 - op) * rise}px)`;
      el.style.pointerEvents = interactive && op > 0.55 ? "auto" : "none";
      el.style.visibility = op <= 0.002 ? "hidden" : "visible";
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible || !awake || !world) return;

      const r = root.getBoundingClientRect();
      const span = r.height - (sh || window.innerHeight);
      const p = span > 0 ? clamp01(-r.top / span) : 0;
      // Pure function of p: if scroll hasn't moved, there is nothing to redraw.
      if (Math.abs(p - lastP) < 0.00004) return;
      lastP = p;

      drawFrame(ctx, world, p, dpr);

      // S0 → S1: the lockup holds, then breathes out.
      const hero = heroRef.current;
      if (hero) {
        const ex = seg(p, SCENES.exhale[0], SCENES.exhale[1]);
        const op = 1 - ex;
        hero.style.opacity = String(op);
        hero.style.transform = `scale(${1 + ex * 0.28})`;
        hero.style.filter = ex > 0.001 ? `blur(${ex * 9}px)` : "";
        hero.style.pointerEvents = op > 0.6 ? "auto" : "none";
        hero.style.visibility = op <= 0.002 ? "hidden" : "visible";
        const word = hero.querySelector("h1");
        if (word) (word as HTMLElement).style.letterSpacing = ex > 0.001 ? `${ex * 0.3}em` : "";
      }
      if (hintRef.current) {
        hintRef.current.style.opacity = String(1 - seg(p, 0.008, 0.04));
      }

      for (const c of CAPTIONS) setLayer(c.id, fade(p, c.range[0], c.range[1]));
      // Copy arrives once the flock has withdrawn to its halo, so cards never
      // travel across the text.
      setLayer("modes", fade(p, 0.645, 0.775), 22, true);
      // One card per stage of scroll — purely a function of p, so pausing
      // pauses the sequence and scrolling back retires cards in reverse.
      const steps = [0.655, 0.675, 0.695, 0.715];
      const mCount = p < 0.645 || p > 0.79 ? 0 : steps.filter((s) => p >= s).length;
      if (mCount !== modesRevealedRef.current) {
        modesRevealedRef.current = mCount;
        setModesRevealed(mCount);
      }
      setLayer("proof", fade(p, 0.79, 0.868), 22);
      setLayer("finale", fade(p, SCENES.swirl[0] + 0.02, 1, true), 22, true);
      // The brand swirl draws itself, scroll-linked, as the finale settles.
      const swirlPath = swirlRef.current?.querySelector("path");
      if (swirlPath) {
        const d = seg(p, SCENES.swirl[0] + 0.03, SCENES.swirl[0] + 0.1);
        swirlPath.style.strokeDasharray = "900";
        swirlPath.style.strokeDashoffset = String(900 * (1 - d));
      }
    };

    const io = new IntersectionObserver((e) => { visible = e[0]?.isIntersecting ?? true; }, { threshold: 0 });
    io.observe(root);
    const onVis = () => { awake = document.visibilityState === "visible"; };
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
    };
  }, [reduced]);

  if (reduced) return <StaticStory />;

  return (
    <div ref={rootRef} className="relative h-[620vh] md:h-[780vh]">
      <div ref={stageRef} className="sticky top-0 h-[100svh] w-full overflow-hidden bg-background">
        {/* ambient warmth — static, never animated */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-[14%] -top-[12%] h-[58vw] w-[58vw] rounded-full opacity-40 blur-3xl [background:radial-gradient(circle,hsl(340_38%_14%)_0%,transparent_66%)]" />
          <div className="absolute -bottom-[16%] -right-[12%] h-[52vw] w-[52vw] rounded-full opacity-40 blur-3xl [background:radial-gradient(circle,hsl(266_34%_14%)_0%,transparent_66%)]" />
        </div>

        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden />

        {/* S0 · Arrival — the lockup, legible over the ground */}
        <div ref={heroRef} className="absolute inset-0 z-10 flex items-center justify-center will-change-transform">
          <HeroLockup animated />
        </div>
        <div
          ref={hintRef}
          aria-hidden
          className="absolute bottom-7 left-0 right-0 z-10 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground/60"
        >
          scroll
        </div>

        {/* S3–S5 · scene copy */}
        {CAPTIONS.map((c) => (
          <div
            key={c.id}
            ref={(el) => { layerRefs.current[c.id] = el; }}
            className={`pointer-events-none absolute z-10 px-6 font-display text-xl italic leading-snug text-foreground/90 opacity-0 sm:text-2xl ${c.className}`}
          >
            {c.text.split("\n").map((l) => (
              <span key={l} className="block">{l}</span>
            ))}
          </div>
        ))}

        {/* S6 · Four ways to study */}
        <div
          ref={(el) => { layerRefs.current["modes"] = el; }}
          className="pointer-events-none absolute inset-0 z-10 flex items-center opacity-0"
        >
          <ModesBlock revealed={modesRevealed} />
        </div>

        {/* S7 · Founder's note */}
        <div
          ref={(el) => { layerRefs.current["proof"] = el; }}
          className="pointer-events-none absolute inset-0 z-10 flex items-center opacity-0"
        >
          <ProofBlock />
        </div>

        {/* S8 · The swirl and the ask */}
        <div
          ref={(el) => { layerRefs.current["finale"] = el; }}
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center opacity-0"
        >
          <div ref={swirlRef} className="w-full">
            <FinaleBlock />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryStage;
