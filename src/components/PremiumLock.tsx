import { Link } from "react-router-dom";
import { Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlashcardText } from "@/components/FlashcardText";
import { cn } from "@/lib/utils";
import { PREMIUM_CARD_NAMES, type PremiumCardType } from "@/lib/premium";

/** The "Premium" tag on anything that needs it. */
export const PremiumPill = ({ className }: { className?: string }) => (
  <span className={cn("rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground", className)}>
    Premium
  </span>
);

/** An ember crown pinned to the corner of a round, icon-only button. */
export const PremiumCornerMark = ({ className }: { className?: string }) => (
  <span
    aria-hidden
    className={cn(
      "pointer-events-none absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-primary-foreground shadow-sm [background-image:var(--gradient-primary)]",
      className,
    )}
  >
    <Crown className="h-2.5 w-2.5" strokeWidth={2.4} />
  </span>
);

interface LockedFlashcardProps {
  term: string;
  type: PremiumCardType;
  textColor: string;
  onUpgrade: () => void;
}

/**
 * A premium card, seen by someone without Premium. The term stays readable so
 * they know what the card is; the diagram or drawing behind it stays shut.
 */
export const LockedFlashcard = ({ term, type, textColor, onUpgrade }: LockedFlashcardProps) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-5 p-6 text-center">
    <FlashcardText text={term} className="max-h-[45%] overflow-y-auto text-2xl font-bold" style={{ color: textColor }} />
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-background/95 px-5 py-4 text-foreground shadow-sm">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Lock className="h-4 w-4" />
        {PREMIUM_CARD_NAMES[type]} · Premium
      </p>
      <Button
        size="sm"
        variant="brand"
        className="rounded-lg font-bold"
        onClick={(e) => {
          e.stopPropagation();
          onUpgrade();
        }}
      >
        Unlock with Premium
      </Button>
    </div>
  </div>
);

/** Above a study session that left the user's premium cards out. */
export const SkippedPremiumCardsNotice = ({ count, onUpgrade }: { count: number; onUpgrade: () => void }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
    <span className="flex items-center gap-2 text-muted-foreground">
      <Lock className="h-4 w-4 shrink-0" />
      {count} Premium {count === 1 ? "card is" : "cards are"} left out of this session.
    </span>
    <Button size="sm" variant="brand" className="rounded-lg font-bold" onClick={onUpgrade}>
      Unlock with Premium
    </Button>
  </div>
);

interface PremiumLockedPanelProps {
  title: string;
  description: string;
  onUpgrade: () => void;
  backTo: string;
  backLabel?: string;
}

/** Stands in for a whole page or session that needs Premium. */
export const PremiumLockedPanel = ({
  title,
  description,
  onUpgrade,
  backTo,
  backLabel = "Back to Set",
}: PremiumLockedPanelProps) => (
  <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
    <div
      aria-hidden
      className="flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground shadow-[var(--glow-ember)] [background-image:var(--gradient-primary)]"
    >
      <Crown className="h-6 w-6" />
    </div>
    <h1 className="text-2xl font-bold">{title}</h1>
    <p className="text-muted-foreground">{description}</p>
    <div className="mt-2 flex flex-wrap justify-center gap-3">
      <Button variant="brand" size="lg" className="rounded-xl font-bold" onClick={onUpgrade}>
        Unlock with Premium
      </Button>
      <Button asChild variant="outline" size="lg" className="rounded-xl">
        <Link to={backTo}>{backLabel}</Link>
      </Button>
    </div>
  </div>
);
