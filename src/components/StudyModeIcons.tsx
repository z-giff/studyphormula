import { SVGProps } from "react";

/**
 * Study-mode icon system — deliberately distinct from the flashcard-type
 * icons (FileText / Layers / GitBranch / Signature, which mark creation
 * formats). These three mark the ways a set is studied.
 */

const base: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

/** Memorize — a card turning over, mid-flip. */
export const MemorizeIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...props}>
    <rect x="3.5" y="6.5" width="12" height="13" rx="2" />
    <path d="M8 3.5h10a2 2 0 0 1 2 2v11" />
    <path d="M7 12.5l1.8 1.8 3.2-3.6" />
  </svg>
);

/** Swipe Study — a card with sorting directions either side. */
export const SwipeIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...props}>
    <rect x="8" y="5" width="8" height="14" rx="2" />
    <path d="M4.5 12H2.8M4.8 9.6L2.6 12l2.2 2.4" />
    <path d="M19.5 12h1.7M19.2 9.6l2.2 2.4-2.2 2.4" />
  </svg>
);

/** MC Quiz — answer options with one chosen. */
export const QuizIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...props}>
    <circle cx="5.5" cy="6" r="1.9" />
    <path d="M4.7 6l.6.6 1-1.1" strokeWidth={1.4} />
    <path d="M10.5 6H20" />
    <circle cx="5.5" cy="12" r="1.9" />
    <path d="M10.5 12H20" />
    <circle cx="5.5" cy="18" r="1.9" />
    <path d="M10.5 18H17" />
  </svg>
);
