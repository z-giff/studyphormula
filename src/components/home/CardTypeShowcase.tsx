import { FileText, Layers, GitBranch, Signature } from "lucide-react";

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

/* ---------- study modes (text only) ---------- */

const STUDY_MODES = [
  { name: "Memorize", line: "Recall it until it sticks.", accent: ACCENTS.standard },
  { name: "Swipe Study", line: "Sort what needs work.", accent: ACCENTS.interactive },
  { name: "MC Quiz", line: "Test what you remember.", accent: ACCENTS.drawing },
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

    <h2 className="text-center font-display text-[clamp(1.35rem,4.4vw,3rem)] font-medium leading-tight tracking-tight text-foreground">
      Four Cards, Four Ways to Learn
    </h2>
    <p className="mx-auto mt-[clamp(0.25rem,0.9vh,0.75rem)] max-w-xl text-center font-display text-[clamp(0.8rem,2.4vw,1.125rem)] italic leading-snug text-muted-foreground">
      Because not every idea should be studied the same way.
    </p>

    {/* Always 2x2: one column doubles the block height and pushes the scene
        off a phone screen entirely. */}
    <div className="mt-[clamp(0.5rem,1.4vh,1rem)] grid grid-cols-2 gap-[clamp(0.5rem,1.6vw,1.75rem)]">
      {CARD_TYPES.map((f, i) => (
        <div key={f.name} className={`h-full ${i < revealed ? "ph-on" : ""}`}>
          {/* h-full + flex: both cards in a row stay the same height even when
              one label wraps to two lines. */}
          <div className="ph-card flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/80 p-[clamp(0.6rem,1.5vh,1.5rem)] shadow-[0_26px_60px_-32px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:rounded-3xl">
            <div
              className="h-[clamp(62px,11vh,190px)] w-full shrink-0 overflow-hidden rounded-xl border border-line-strong/70 sm:rounded-2xl"
              style={{ background: `linear-gradient(160deg, ${f.accent}14, transparent 70%)` }}
            >
              <f.Demo />
            </div>
            {/* Icon sits above the label on phones so the text keeps the full
                card width; side-by-side from sm up, as before. */}
            <div className="mt-[clamp(0.5rem,1.3vh,1rem)] flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
              <span
                className="flex h-[clamp(1.9rem,4.6vh,3.5rem)] w-[clamp(1.9rem,4.6vh,3.5rem)] shrink-0 items-center justify-center rounded-full border bg-secondary"
                style={{ borderColor: `${f.accent}59`, color: f.accent }}
              >
                <f.icon className="h-[55%] w-[55%]" strokeWidth={1.7} />
              </span>
              <div className="min-w-0">
                <div className="text-[clamp(0.95rem,2.6vw,1.25rem)] font-semibold leading-tight text-foreground">
                  {f.name}
                </div>
                <div className="text-[clamp(0.8rem,2.2vw,1rem)] leading-snug text-muted-foreground">
                  {f.line}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>

    <section
      className={`ph-rail mt-[clamp(0.5rem,1.4vh,1.25rem)] w-full overflow-hidden rounded-2xl border border-border bg-card/60 px-[clamp(0.6rem,1.4vw,1.75rem)] py-[clamp(0.5rem,1.3vh,1.25rem)] shadow-[0_20px_50px_-34px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:rounded-3xl ${
        tail && revealed >= 4 ? "ph-on" : ""
      }`}
      aria-label="Study modes"
    >
      <h3 className="text-center font-display text-[clamp(0.8rem,2.3vw,1.125rem)] font-medium leading-snug tracking-tight text-foreground">
        Four ways to create. Three ways to master.
      </h3>

      {/* Three across at every width — stacking these was ~300px of the mobile
          overflow. Nothing is dropped, only tightened. */}
      <div className="mt-[clamp(0.4rem,1.2vh,1.25rem)] grid grid-cols-3 divide-x divide-border">
        {STUDY_MODES.map((m, i) => (
          <div
            key={m.name}
            className="ph-mode flex flex-col items-center gap-1.5 px-[clamp(0.25rem,1vw,1.5rem)] py-[clamp(0.25rem,0.9vh,1rem)] text-center"
            style={{ animationDelay: `${0.25 + i * 0.18}s` }}
          >
            <span className="h-px w-6 rounded-full sm:w-8" style={{ background: `${m.accent}80` }} />
            <span className="text-[clamp(0.85rem,2.3vw,1.125rem)] font-semibold leading-tight tracking-tight text-foreground">
              {m.name}
            </span>
            <p className="max-w-[24ch] text-[clamp(0.72rem,2vw,0.875rem)] leading-snug text-muted-foreground">
              {m.line}
            </p>
          </div>
        ))}
      </div>
    </section>
  </div>
);

export default CardTypeShowcase;