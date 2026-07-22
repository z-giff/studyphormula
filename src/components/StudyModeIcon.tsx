import { Brain, GalleryHorizontalEnd, ListChecks } from "lucide-react";

export type StudyMode = "memorize" | "swipe" | "quiz";

const MODE_ICONS: Record<StudyMode, typeof Brain> = {
  memorize: Brain,
  swipe: GalleryHorizontalEnd,
  quiz: ListChecks,
};

export const STUDY_MODE_LABELS: Record<StudyMode, string> = {
  memorize: "Memorize",
  swipe: "Swipe Study",
  quiz: "MC Quiz",
};

interface StudyModeIconProps {
  mode: StudyMode;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Study-mode glyphs: rounded-square ember tiles, deliberately distinct from
 * the circular flashcard-type controls so the two systems never blur.
 */
export const StudyModeIcon = ({ mode, size = "sm", className = "" }: StudyModeIconProps) => {
  const Icon = MODE_ICONS[mode];
  const tile = size === "sm" ? "w-6 h-6 rounded-md" : "w-9 h-9 rounded-lg";
  const glyph = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center shrink-0 ${tile} ${className}`}
      style={{
        background: "hsl(var(--ember) / 0.14)",
        color: "hsl(var(--ember))",
      }}
    >
      <Icon className={glyph} />
    </span>
  );
};
