import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * Ember & Ink — "One story, nine scenes."
 * A single flock of flashcards travels through ten formations (Scene 0–9)
 * as the visitor scrolls. Captions are synchronized to each scene.
 */

const SCENE_COUNT = 10;
const CARD_COUNT = 24;

interface CardPose {
  x: number; // percent of viewport width, 0 = center
  y: number; // percent of viewport height, 0 = center
  r: number; // rotation deg
  s: number; // scale
  o: number; // opacity
}

// Deterministic pseudo-random in [0, 1)
const rand = (i: number, salt: number) => {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

// ── Formations ────────────────────────────────────────────────────────────
const scatter = (i: number, salt: number, spread = 1): CardPose => ({
  x: (rand(i, salt) - 0.5) * 84 * spread,
  y: (rand(i, salt + 1) - 0.5) * 66 * spread,
  r: (rand(i, salt + 2) - 0.5) * 56,
  s: 0.75 + rand(i, salt + 3) * 0.4,
  o: 0.5 + rand(i, salt + 4) * 0.45,
});

const formations: Array<(i: number) => CardPose> = [
  // Scene 0 — Chaos: notes everywhere.
  (i) => scatter(i, 7),

  // Scene 1 — The spark: one ember card pulls focus, the rest lean in.
  (i) => {
    if (i === 0) return { x: 0, y: -4, r: -3, s: 1.5, o: 1 };
    const p = scatter(i, 7, 0.82);
    return { ...p, x: p.x * 0.85, y: p.y * 0.85, o: p.o * 0.75 };
  },

  // Scene 2 — Gathering: a loose cloud forms around the spark.
  (i) => {
    const a = (i / CARD_COUNT) * Math.PI * 2 + rand(i, 21) * 0.9;
    const rad = 10 + rand(i, 22) * 17;
    return {
      x: Math.cos(a) * rad * 1.35,
      y: Math.sin(a) * rad * 0.9,
      r: (rand(i, 23) - 0.5) * 24,
      s: 0.85 + rand(i, 24) * 0.2,
      o: 0.9,
    };
  },

  // Scene 3 — Formation: the flock flies in a chevron.
  (i) => {
    const wing = i % 2 === 0 ? -1 : 1;
    const k = Math.floor(i / 2);
    return {
      x: wing * k * 3.6,
      y: -14 + k * 4.4,
      r: wing * 9,
      s: 0.9,
      o: 1,
    };
  },

  // Scene 4 — Order from ink: a clean 6×4 grid.
  (i) => {
    const col = i % 6;
    const row = Math.floor(i / 6);
    return {
      x: (col - 2.5) * 13.5,
      y: (row - 1.5) * 17,
      r: 0,
      s: 1,
      o: 1,
    };
  },

  // Scene 5 — Stacks: filed into three subjects.
  (i) => {
    const stack = i % 3;
    const depth = Math.floor(i / 3);
    return {
      x: (stack - 1) * 25 + (rand(i, 51) - 0.5) * 2,
      y: 6 - depth * 1.7,
      r: (rand(i, 52) - 0.5) * 7,
      s: 1,
      o: 1,
    };
  },

  // Scene 6 — Shuffle: the deck orbits.
  (i) => {
    const a = (i / CARD_COUNT) * Math.PI * 2;
    return {
      x: Math.cos(a) * 30,
      y: Math.sin(a) * 22,
      r: (a * 180) / Math.PI + 90,
      s: 0.85,
      o: 1,
    };
  },

  // Scene 7 — Four ways to create: four clusters.
  (i) => {
    const q = i % 4;
    const cx = [-24, 24, -24, 24][q];
    const cy = [-16, -16, 16, 16][q];
    return {
      x: cx + (rand(i, 71) - 0.5) * 11,
      y: cy + (rand(i, 72) - 0.5) * 9,
      r: (rand(i, 73) - 0.5) * 16,
      s: 0.9,
      o: 1,
    };
  },

  // Scene 8 — Three ways to master: three fans.
  (i) => {
    const g = i % 3;
    const k = Math.floor(i / 3);
    const a = (k - 3.5) * 0.16;
    return {
      x: (g - 1) * 27 + Math.sin(a) * 12,
      y: 8 - Math.cos(a) * 10,
      r: (a * 180) / Math.PI,
      s: 0.9,
      o: 1,
    };
  },

  // Scene 9 — The phormula: one settled deck behind the call to action.
  (i) => {
    const d = i / CARD_COUNT;
    return {
      x: (rand(i, 91) - 0.5) * 3,
      y: 14 - d * 3,
      r: (rand(i, 92) - 0.5) * 8 * (1 - d),
      s: 1.05,
      o: i > CARD_COUNT - 6 ? 1 : 0.9,
    };
  },
];

const captions = [
  { kicker: "Phormula", title: "Studying starts as chaos.", body: "Loose notes. Ten tabs. Nothing sticks." },
  { kicker: "Scene 01", title: "Then — a spark.", body: "One card. One idea. That's the whole trick." },
  { kicker: "Scene 02", title: "Ideas find each other.", body: "Cards gather into sets that make sense together." },
  { kicker: "Scene 03", title: "They move in formation.", body: "Your study flow, flying in order — not scattered across apps." },
  { kicker: "Scene 04", title: "Order, from ink.", body: "Every set laid out clean, colour-coded, ready to review." },
  { kicker: "Scene 05", title: "Filed by subject.", body: "Biology left. History right. Chaos, organized." },
  { kicker: "Scene 06", title: "Shuffle. Flip. Repeat.", body: "Memorization is a motion. Phormula keeps it moving." },
  { kicker: "Scene 07", title: "Four ways to make a card.", body: "Standard. Interactive. Flowchart. Drawing." },
  { kicker: "Scene 08", title: "Three ways to master them.", body: "Memorize. Swipe. Quiz. Pick your pressure." },
  { kicker: "Scene 09", title: "Your Phormula to studying.", body: "Everything you need to remember — in one deck." },
];

// Card visual variants: mostly paper, a few ink, a few ember.
const variantFor = (i: number): "ember" | "ink" | "paper" => {
  if (i === 0 || i % 8 === 5) return "ember";
  if (i % 3 === 1) return "ink";
  return "paper";
};

const StoryCard = ({ i, pose }: { i: number; pose: CardPose }) => {
  const variant = variantFor(i);
  const base =
    "absolute left-1/2 top-1/2 rounded-xl border will-change-transform " +
    "w-[clamp(56px,9vmin,92px)] h-[clamp(38px,6.1vmin,62px)]";
  const look =
    variant === "ember"
      ? "border-transparent shadow-[var(--shadow-ember)]"
      : variant === "ink"
        ? "border-black/20 shadow-md"
        : "border-border shadow-sm";
  return (
    <div
      aria-hidden
      className={`${base} ${look}`}
      style={{
        background:
          variant === "ember"
            ? "var(--gradient-ember)"
            : variant === "ink"
              ? "var(--gradient-ink)"
              : "hsl(var(--card))",
        transform: `translate(-50%, -50%) translate(${pose.x}vw, ${pose.y}vh) rotate(${pose.r}deg) scale(${pose.s})`,
        opacity: pose.o,
        transition:
          "transform 1.05s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.9s ease",
        transitionDelay: `${(i % 8) * 45}ms`,
      }}
    >
      {/* Ink lines suggesting card content */}
      <div className="absolute inset-0 flex flex-col justify-center gap-[9%] px-[14%]">
        <div
          className="h-[8%] w-3/5 rounded-full"
          style={{
            background:
              variant === "paper"
                ? "hsl(var(--ink) / 0.55)"
                : "hsl(0 0% 100% / 0.75)",
          }}
        />
        <div
          className="h-[6%] w-4/5 rounded-full"
          style={{
            background:
              variant === "paper"
                ? "hsl(var(--ink) / 0.22)"
                : "hsl(0 0% 100% / 0.4)",
          }}
        />
        <div
          className="h-[6%] w-2/5 rounded-full"
          style={{
            background:
              variant === "paper"
                ? "hsl(var(--ink) / 0.22)"
                : "hsl(0 0% 100% / 0.4)",
          }}
        />
      </div>
    </div>
  );
};

const EmberInkStory = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const track = trackRef.current;
        if (!track) return;
        const rect = track.getBoundingClientRect();
        const scrollable = rect.height - window.innerHeight;
        const progress = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;
        const next = Math.min(SCENE_COUNT - 1, Math.floor(progress * SCENE_COUNT));
        setScene((prev) => (prev === next ? prev : next));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [reducedMotion]);

  const poses = useMemo(
    () => Array.from({ length: CARD_COUNT }, (_, i) => formations[scene](i)),
    [scene]
  );

  const caption = captions[scene];
  const isFinal = scene === SCENE_COUNT - 1;

  // Reduced motion: a calm, static hero with the same message and CTAs.
  if (reducedMotion) {
    return (
      <section className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-2xl text-center space-y-6 py-32">
          <p className="text-sm uppercase tracking-[0.3em] text-primary font-medium">Phormula</p>
          <h1 className="text-5xl md:text-6xl font-display text-foreground">
            Your Phormula to studying.
          </h1>
          <p className="text-lg text-muted-foreground">
            Beautiful flashcards, four ways to create, three ways to master.
            Everything you need to remember — in one deck.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link to="/auth?mode=signup">
              <Button size="lg">Get started</Button>
            </Link>
            <Link to="/auth?mode=signin">
              <Button size="lg" variant="outline">Sign in</Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div ref={trackRef} style={{ height: `${SCENE_COUNT * 100}vh` }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Warm paper atmosphere with a faint ember glow */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(90% 70% at 50% 30%, hsl(var(--ember) / 0.07) 0%, transparent 60%), hsl(var(--background))",
          }}
        />

        {/* The flock */}
        <div className="absolute inset-0">
          {poses.map((pose, i) => (
            <StoryCard key={i} i={i} pose={pose} />
          ))}
        </div>

        {/* Synchronized caption */}
        <div className="absolute inset-x-0 bottom-0 pb-14 md:pb-20 pointer-events-none">
          <div className="container mx-auto px-6">
            <div key={scene} className="max-w-xl mx-auto text-center animate-caption-in">
              <p className="text-xs md:text-sm uppercase tracking-[0.3em] text-primary font-medium mb-3">
                {caption.kicker}
              </p>
              <h2 className="text-3xl md:text-5xl font-display text-foreground mb-3 text-balance">
                {caption.title}
              </h2>
              <p className="text-sm md:text-base text-muted-foreground">{caption.body}</p>

              {isFinal && (
                <div className="flex items-center justify-center gap-3 pt-6 pointer-events-auto">
                  <Link to="/auth?mode=signup">
                    <Button size="lg" className="shadow-[var(--shadow-ember)]">
                      Get started
                    </Button>
                  </Link>
                  <Link to="/auth?mode=signin">
                    <Button size="lg" variant="outline">Sign in</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scene progress */}
        <div className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2" aria-hidden>
          {Array.from({ length: SCENE_COUNT }, (_, i) => (
            <span
              key={i}
              className="block w-1 rounded-full transition-all duration-500"
              style={{
                height: i === scene ? 22 : 7,
                background: i === scene ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.18)",
              }}
            />
          ))}
        </div>

        {/* Scroll hint on the opening scene */}
        <div
          className={`absolute bottom-4 inset-x-0 text-center text-xs uppercase tracking-[0.25em] text-muted-foreground transition-opacity duration-700 ${scene === 0 ? "opacity-100" : "opacity-0"}`}
          aria-hidden
        >
          Scroll
        </div>
      </div>
    </div>
  );
};

export default EmberInkStory;
