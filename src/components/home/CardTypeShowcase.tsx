import { FileText, Layers, GitBranch, Signature } from "lucide-react";
import { MemorizeIcon, SwipeIcon, QuizIcon } from "@/components/StudyModeIcons";

/**
 * S5 · "Four kinds of cards."
 *
 * Four enlarged Phormula flashcards in a 2x2 field. Each one carries a small,
 * self-contained demo of what that card type does. The demos are pure CSS/SVG,
 * play once when the scene enters (driven by the `active` flag the stage flips
 * on scroll) and reset when the scene leaves, so scrubbing backwards replays
 * them cleanly. Nothing loops, nothing escapes its own card.
 */

const ACCENTS = {
  standard: "#F7A03E",
  interactive: "#F2795F",
  flowchart: "#7E8BE0",
  drawing: "#EE5D9B",
};

/* ---------- per-type demos ---------- */

const StandardDemo = () => (
  <div className="ph-demo-flip-scene h-full w-full [perspective:600px]">
    <div className="ph-demo-flip relative mx-auto h-full w-[58%]">
      <div className="ph-face absolute inset-0 flex items-center justify-center rounded-lg border border-line-strong bg-secondary text-[11px] font-semibold text-foreground">
        Mitosis
      </div>
      <div className="ph-face ph-face-back absolute inset-0 flex items-center justify-center rounded-lg border border-[#F7A03E]/45 bg-[#F7A03E]/12 px-2 text-center text-[10px] leading-tight text-foreground">
        Cell division into two
      </div>
    </div>
  </div>
);

const InteractiveDemo = () => (
  <svg viewBox="0 0 200 96" className="h-full w-full" aria-hidden>
    <g className="ph-demo-cell">
      <ellipse cx="58" cy="48" rx="42" ry="32" fill="#F2795F" opacity="0.12" />
      <ellipse cx="58" cy="48" rx="42" ry="32" fill="none" stroke="#F2795F" strokeWidth="1.6" opacity="0.8" />
      <circle cx="52" cy="45" r="12" fill="#EE5D9B" opacity="0.28" />
      <circle cx="52" cy="45" r="12" fill="none" stroke="#EE5D9B" strokeWidth="1.3" opacity="0.75" />
      <circle cx="52" cy="45" r="4" fill="#EE5D9B" opacity="0.5" />
      <ellipse cx="82" cy="64" rx="9" ry="5" fill="none" stroke="#F2795F" strokeWidth="1.1" opacity="0.4" transform="rotate(-20 82 64)" />
      <ellipse cx="34" cy="68" rx="7" ry="4" fill="none" stroke="#F2795F" strokeWidth="1.1" opacity="0.35" transform="rotate(15 34 68)" />
      <circle cx="80" cy="32" r="4" fill="none" stroke="#F2795F" strokeWidth="1.1" opacity="0.35" />
    </g>
    <path
      className="ph-demo-line"
      d="M62 40 L96 22 H118"
      fill="none"
      stroke="#F2795F"
      strokeWidth="1.1"
      strokeLinecap="round"
      opacity="0.6"
    />
    <g className="ph-demo-field">
      <rect x="118" y="10" width="70" height="26" rx="7" fill="hsl(var(--secondary))" stroke="#F2795F" strokeWidth="1.4" />
      <text x="130" y="27" fontSize="11" fill="hsl(var(--foreground))" className="ph-demo-type">
        Nucleus
      </text>
    </g>
  </svg>
);

const FlowchartDemo = () => (
  <svg viewBox="0 0 200 96" className="h-full w-full" aria-hidden>
    <path
      className="ph-demo-line"
      d="M50 30 H132 M150 44 V62 M132 76 H68"
      fill="none"
      stroke="#7E8BE0"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.75"
    />
    {[
      { x: 24, y: 20, d: 0 },
      { x: 132, y: 20, d: 1 },
      { x: 132, y: 62, d: 2 },
      { x: 44, y: 62, d: 3 },
    ].map((n) => (
      <rect
        key={`${n.x}-${n.y}`}
        className="ph-demo-node"
        style={{ animationDelay: `${0.12 + n.d * 0.22}s` }}
        x={n.x}
        y={n.y}
        width="26"
        height="20"
        rx="6"
        fill="#7E8BE0"
        opacity="0.85"
      />
    ))}
  </svg>
);

const DrawingDemo = () => (
  <svg viewBox="0 0 200 96" className="h-full w-full" aria-hidden>
    <path
      className="ph-demo-line"
      style={{ animationDelay: "0.1s" }}
      d="M38 66c14-38 40-44 54-16s34 22 52-14"
      fill="none"
      stroke="#EE5D9B"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      className="ph-demo-line"
      style={{ animationDelay: "0.7s" }}
      d="M52 78h96"
      fill="none"
      stroke="#EE5D9B"
      strokeWidth="1.4"
      strokeLinecap="round"
      opacity="0.5"
    />
  </svg>
);

const CARD_TYPES = [
  { icon: FileText, name: "Standard", line: "Flip it till it sticks.", accent: ACCENTS.standard, Demo: StandardDemo },
  { icon: Layers, name: "Interactive", line: "Label the image from memory.", accent: ACCENTS.interactive, Demo: InteractiveDemo },
  { icon: GitBranch, name: "Flowchart", line: "See how it connects.", accent: ACCENTS.flowchart, Demo: FlowchartDemo },
  { icon: Signature, name: "Drawing", line: "Sketch it to remember it.", accent: ACCENTS.drawing, Demo: DrawingDemo },
];

/* ---------- study-mode mini demos ---------- */

const MemorizeMiniDemo = () => (
  <div className="ph-mini h-full w-full [perspective:520px]">
    <div className="ph-mini-flip relative mx-auto h-full w-[62px]">
      <div className="ph-mini-face absolute inset-0 flex items-center justify-center rounded-md border border-line-strong bg-secondary text-[9px] font-semibold text-foreground">
        Term
      </div>
      <div className="ph-mini-face ph-mini-back absolute inset-0 flex items-center justify-center rounded-md border border-[#F7A03E]/45 bg-[#F7A03E]/12 text-[9px] font-semibold text-foreground">
        Answer
      </div>
    </div>
  </div>
);

const SwipeMiniDemo = () => (
  <div className="ph-mini relative h-full w-full">
    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-wide text-[#F2795F]/70">
      ←
    </span>
    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-wide text-[hsl(var(--success))]/70">
      →
    </span>
    <div className="ph-mini-swipe mx-auto h-full w-[62px] rounded-md border border-line-strong bg-secondary" />
  </div>
);

const QuizMiniDemo = () => (
  <div className="ph-mini flex h-full w-full flex-col justify-center gap-[5px] px-4">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className={`ph-mini-opt flex h-[13px] items-center gap-2 rounded-[5px] border px-2 ${
          i === 1 ? "ph-mini-opt-sel border-[#EE5D9B]/50 bg-[#EE5D9B]/12" : "border-line-strong/70 bg-secondary"
        }`}
        style={{ animationDelay: `${0.15 + i * 0.18}s` }}
      >
        <span className={`h-[6px] w-[6px] rounded-full ${i === 1 ? "bg-[#EE5D9B]" : "bg-muted-foreground/40"}`} />
        <span className={`h-[3px] flex-1 rounded-full ${i === 1 ? "bg-[#EE5D9B]/40" : "bg-muted-foreground/20"}`} />
      </div>
    ))}
  </div>
);

const STUDY_MODES = [
  { icon: MemorizeIcon, name: "Memorize", line: "Recall it until it sticks.", Demo: MemorizeMiniDemo },
  { icon: SwipeIcon, name: "Swipe Study", line: "Sort what you know from what needs work.", Demo: SwipeMiniDemo },
  { icon: QuizIcon, name: "MC Quiz", line: "Choose, check, and strengthen your recall.", Demo: QuizMiniDemo },
];

/**
 * `revealed` is the number of cards that should currently be on screen (0-4),
 * driven directly by scroll progress — never by a timer.
 */
const CardTypeShowcase = ({ revealed = 4, tail = true }: { revealed?: number; tail?: boolean }) => (
  <div className="mx-auto w-full max-w-6xl px-6" data-scene="cards">
    <style>{`
      @keyframes ph-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
      @keyframes ph-flip { 0%,18% { transform: rotateY(0deg); } 62%,100% { transform: rotateY(180deg); } }
      @keyframes ph-draw { from { stroke-dashoffset: 240; } to { stroke-dashoffset: 0; } }
      @keyframes ph-pop { from { opacity: 0; transform: scale(0.7); } to { opacity: 0.85; transform: none; } }
      @keyframes ph-type { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
      @keyframes ph-caret { 0% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(46px); opacity: 0; } }
      [data-scene="cards"] .ph-card { opacity: 0; }
      [data-scene="cards"] .ph-on .ph-card { animation: ph-rise .62s cubic-bezier(.22,.9,.28,1) forwards; }
      [data-scene="cards"] .ph-tail { opacity: 0; }
      [data-scene="cards"] .ph-tail.ph-on { animation: ph-rise .6s cubic-bezier(.22,.9,.28,1) forwards; }
      [data-scene="cards"] .ph-demo-flip { transform-style: preserve-3d; }
      [data-scene="cards"] .ph-on .ph-demo-flip { animation: ph-flip 2.2s .45s cubic-bezier(.5,0,.2,1) forwards; }
      [data-scene="cards"] .ph-face { backface-visibility: hidden; }
      [data-scene="cards"] .ph-face-back { transform: rotateY(180deg); }
      [data-scene="cards"] .ph-demo-line { stroke-dasharray: 240; stroke-dashoffset: 240; }
      [data-scene="cards"] .ph-on .ph-demo-line { animation: ph-draw 1.15s .35s ease-out forwards; }
      [data-scene="cards"] .ph-demo-node { opacity: 0; }
      [data-scene="cards"] .ph-on .ph-demo-node { animation: ph-pop .4s ease-out forwards; }
      [data-scene="cards"] .ph-demo-field { opacity: 0; }
      [data-scene="cards"] .ph-on .ph-demo-field { animation: ph-rise .45s 1.1s ease-out forwards; }
      [data-scene="cards"] .ph-demo-cell { opacity: 0; }
      [data-scene="cards"] .ph-on .ph-demo-cell { animation: ph-rise .55s .1s ease-out forwards; }
      [data-scene="cards"] .ph-demo-type { clip-path: inset(0 100% 0 0); }
      [data-scene="cards"] .ph-on .ph-demo-type { animation: ph-type .6s 1.25s steps(9) forwards; }
      @keyframes ph-swipe { 0%,10% { transform: translateX(0); } 34% { transform: translateX(-16px) rotate(-6deg); } 58% { transform: translateX(16px) rotate(6deg); } 82%,100% { transform: translateX(0) rotate(0deg); } }
      [data-scene="cards"] .ph-rail { opacity: 0; }
      [data-scene="cards"] .ph-rail.ph-on { animation: ph-rise .6s cubic-bezier(.22,.9,.28,1) forwards; }
      [data-scene="cards"] .ph-mode { opacity: 0; }
      [data-scene="cards"] .ph-rail.ph-on .ph-mode { animation: ph-rise .5s cubic-bezier(.22,.9,.28,1) forwards; }
      [data-scene="cards"] .ph-mini-flip { transform-style: preserve-3d; }
      [data-scene="cards"] .ph-rail.ph-on .ph-mini-flip { animation: ph-flip 2s 1s cubic-bezier(.5,0,.2,1) forwards; }
      [data-scene="cards"] .ph-mini-face { backface-visibility: hidden; }
      [data-scene="cards"] .ph-mini-back { transform: rotateY(180deg); }
      [data-scene="cards"] .ph-rail.ph-on .ph-mini-swipe { animation: ph-swipe 2.4s 1.1s cubic-bezier(.4,0,.3,1) forwards; }
      [data-scene="cards"] .ph-mini-opt { opacity: 0; }
      [data-scene="cards"] .ph-rail.ph-on .ph-mini-opt { animation: ph-rise .4s ease-out forwards; }
      @media (prefers-reduced-motion: reduce) {
        [data-scene="cards"] .ph-card, [data-scene="cards"] .ph-tail { opacity: 1; animation: none; }
        [data-scene="cards"] .ph-demo-line { stroke-dashoffset: 0; }
        [data-scene="cards"] .ph-demo-node, [data-scene="cards"] .ph-demo-field, [data-scene="cards"] .ph-demo-cell { opacity: 1; }
        [data-scene="cards"] .ph-demo-type { clip-path: none; }
        [data-scene="cards"] .ph-rail, [data-scene="cards"] .ph-mode, [data-scene="cards"] .ph-mini-opt { opacity: 1; animation: none; }
        [data-scene="cards"] .ph-mini-flip, [data-scene="cards"] .ph-mini-swipe { animation: none; }
      }
    `}</style>

    <h2 className="text-center font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl lg:text-5xl">
      Four Cards, Four Ways to Learn
    </h2>

    <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-7">
      {CARD_TYPES.map((f, i) => (
        <div key={f.name} className={i < revealed ? "ph-on" : undefined}>
          <div className="ph-card overflow-hidden rounded-3xl border border-border bg-card/80 p-5 shadow-[0_26px_60px_-32px_rgba(0,0,0,0.9)] backdrop-blur-sm lg:p-6">
            <div
              className="h-[15vh] max-h-[190px] min-h-[110px] w-full overflow-hidden rounded-2xl border border-line-strong/70"
              style={{ background: `linear-gradient(160deg, ${f.accent}14, transparent 70%)` }}
            >
              <f.Demo />
            </div>
            <div className="mt-4 flex items-center gap-4">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-secondary lg:h-14 lg:w-14"
                style={{ borderColor: `${f.accent}59`, color: f.accent }}
              >
                <f.icon className="h-6 w-6" strokeWidth={1.7} />
              </span>
              <div className="min-w-0">
                <div className="text-lg font-semibold text-foreground lg:text-xl">{f.name}</div>
                <div className="text-sm text-muted-foreground lg:text-base">{f.line}</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>

    <section
      className={`ph-rail mt-5 w-full overflow-hidden rounded-3xl border border-border bg-card/60 px-5 py-4 shadow-[0_20px_50px_-34px_rgba(0,0,0,0.9)] backdrop-blur-sm lg:px-7 lg:py-5 ${
        tail && revealed >= 4 ? "ph-on" : ""
      }`}
      aria-label="Study modes"
    >
      <h3 className="text-center font-display text-base font-medium tracking-tight text-foreground sm:text-lg">
        Four ways to create. Three ways to master.
      </h3>

      <div className="mt-3 grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {STUDY_MODES.map((m, i) => (
          <div
            key={m.name}
            className="ph-mode flex flex-col items-center gap-2 px-3 py-3 text-center sm:py-1"
            style={{ animationDelay: `${0.25 + i * 0.18}s` }}
          >
            <div className="flex items-center gap-2">
              <m.icon className="h-[18px] w-[18px] text-primary" />
              <span className="text-sm font-semibold text-foreground">{m.name}</span>
            </div>
            <p className="max-w-[22ch] text-xs leading-snug text-muted-foreground">{m.line}</p>
            <div className="h-[46px] w-full max-w-[180px] overflow-hidden rounded-xl border border-line-strong/50 bg-secondary/40 py-1">
              <m.Demo />
            </div>
          </div>
        ))}
      </div>
    </section>
  </div>
);

export default CardTypeShowcase;