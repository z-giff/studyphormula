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
    <rect x="14" y="14" width="72" height="68" rx="9" fill="#F2795F" opacity="0.14" />
    <circle cx="50" cy="40" r="15" fill="none" stroke="#F2795F" strokeWidth="1.6" opacity="0.7" />
    <path d="M32 68c6-12 30-12 36 0" fill="none" stroke="#F2795F" strokeWidth="1.6" opacity="0.7" />
    <line x1="86" y1="48" x2="106" y2="48" stroke="#F2795F" strokeWidth="1.2" opacity="0.55" />
    <g className="ph-demo-field">
      <rect x="108" y="34" width="78" height="28" rx="7" fill="hsl(var(--secondary))" stroke="#F2795F" strokeWidth="1.4" />
      <text x="120" y="52" fontSize="11" fill="hsl(var(--foreground))" className="ph-demo-type">
        Nucleus
      </text>
      <rect className="ph-demo-caret" x="120" y="41" width="1.6" height="14" fill="#F2795F" />
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

const STUDY_MODES = [
  { icon: MemorizeIcon, name: "Memorize" },
  { icon: SwipeIcon, name: "Swipe Study" },
  { icon: QuizIcon, name: "MC Quiz" },
];

const CardTypeShowcase = ({ active }: { active: boolean }) => (
  <div className={`mx-auto w-full max-w-4xl px-6 ${active ? "ph-in" : ""}`} data-scene="cards">
    <style>{`
      @keyframes ph-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
      @keyframes ph-flip { 0%,18% { transform: rotateY(0deg); } 62%,100% { transform: rotateY(180deg); } }
      @keyframes ph-draw { from { stroke-dashoffset: 240; } to { stroke-dashoffset: 0; } }
      @keyframes ph-pop { from { opacity: 0; transform: scale(0.7); } to { opacity: 0.85; transform: none; } }
      @keyframes ph-type { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
      @keyframes ph-caret { 0% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(46px); opacity: 0; } }
      [data-scene="cards"] .ph-card { opacity: 0; }
      [data-scene="cards"].ph-in .ph-card { animation: ph-rise .62s cubic-bezier(.22,.9,.28,1) forwards; }
      [data-scene="cards"] .ph-tail { opacity: 0; }
      [data-scene="cards"].ph-in .ph-tail { animation: ph-rise .6s .78s cubic-bezier(.22,.9,.28,1) forwards; }
      [data-scene="cards"] .ph-demo-flip { transform-style: preserve-3d; }
      [data-scene="cards"].ph-in .ph-demo-flip { animation: ph-flip 2.2s .45s cubic-bezier(.5,0,.2,1) forwards; }
      [data-scene="cards"] .ph-face { backface-visibility: hidden; }
      [data-scene="cards"] .ph-face-back { transform: rotateY(180deg); }
      [data-scene="cards"] .ph-demo-line { stroke-dasharray: 240; stroke-dashoffset: 240; }
      [data-scene="cards"].ph-in .ph-demo-line { animation: ph-draw 1.15s .35s ease-out forwards; }
      [data-scene="cards"] .ph-demo-node { opacity: 0; }
      [data-scene="cards"].ph-in .ph-demo-node { animation: ph-pop .4s ease-out forwards; }
      [data-scene="cards"] .ph-demo-field { opacity: 0; }
      [data-scene="cards"].ph-in .ph-demo-field { animation: ph-rise .45s .25s ease-out forwards; }
      [data-scene="cards"] .ph-demo-type { clip-path: inset(0 100% 0 0); }
      [data-scene="cards"].ph-in .ph-demo-type { animation: ph-type .8s .6s steps(9) forwards; }
      [data-scene="cards"] .ph-demo-caret { opacity: 0; }
      [data-scene="cards"].ph-in .ph-demo-caret { animation: ph-caret .8s .6s steps(9) forwards; }
      @media (prefers-reduced-motion: reduce) {
        [data-scene="cards"] .ph-card, [data-scene="cards"] .ph-tail { opacity: 1; animation: none; }
        [data-scene="cards"] .ph-demo-line { stroke-dashoffset: 0; }
        [data-scene="cards"] .ph-demo-node, [data-scene="cards"] .ph-demo-field { opacity: 1; }
        [data-scene="cards"] .ph-demo-type { clip-path: none; }
      }
    `}</style>

    <h2 className="text-center font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
      Four kinds of cards.
    </h2>

    <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {CARD_TYPES.map((f, i) => (
        <div
          key={f.name}
          className="ph-card overflow-hidden rounded-2xl border border-border bg-card/80 p-4 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.9)] backdrop-blur-sm"
          style={{ animationDelay: `${0.06 + i * 0.11}s` }}
        >
          <div
            className="h-[96px] w-full overflow-hidden rounded-xl border border-line-strong/70"
            style={{ background: `linear-gradient(160deg, ${f.accent}14, transparent 70%)` }}
          >
            <f.Demo />
          </div>
          <div className="mt-3.5 flex items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-secondary"
              style={{ borderColor: `${f.accent}59`, color: f.accent }}
            >
              <f.icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
            </span>
            <div className="min-w-0">
              <div className="font-semibold text-foreground">{f.name}</div>
              <div className="text-sm text-muted-foreground">{f.line}</div>
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="ph-tail mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
      <span className="font-display text-base italic text-muted-foreground">
        …then study them three ways:
      </span>
      {STUDY_MODES.map((m) => (
        <span key={m.name} className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          <m.icon className="h-[18px] w-[18px] text-primary" />
          {m.name}
        </span>
      ))}
    </div>
  </div>
);

export default CardTypeShowcase;