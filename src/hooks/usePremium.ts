import { createContext, useContext } from "react";
import type { PremiumFeature, PremiumStatus, TrialLimitedFeature, TrialUsage, TrialUseClaim } from "@/lib/premium";

export interface PremiumContextType {
  /** The signed-in user has Premium. False until their plan has loaded. */
  isPremium: boolean;
  /** Still finding out. Lock nothing on screen until this is false. */
  loading: boolean;
  status: PremiumStatus | null;
  /** Premium on a free trial rather than a paid plan: a few features are counted. */
  isTrial: boolean;
  /** The trial's uses so far. Null off a trial, and until they have loaded. */
  trialUsage: TrialUsage | null;
  /**
   * Uses of `feature` the trial has left, or null when nothing is counted: a
   * paid plan, no Premium, or counts still loading.
   */
  trialUsesLeft: (feature: TrialLimitedFeature) => number | null;
  /** Re-read the plan, and the trial's uses when on a trial. */
  refresh: () => Promise<PremiumStatus | null>;
  /** Re-read just the trial's uses, after using one. */
  refreshTrialUsage: () => Promise<void>;
  /**
   * Take one of the trial's uses of `feature`. The edge functions take their
   * own; the MC Quiz, which runs in the browser, takes one here.
   */
  claimTrialUse: (feature: TrialLimitedFeature) => Promise<TrialUseClaim>;
  /**
   * Open the upgrade dialog. `returnPath` is where Stripe Checkout sends the
   * user back to once they've paid; it defaults to the page they're on. On a
   * free trial the dialog offers to start the paid plan now instead.
   */
  openUpgrade: (feature?: PremiumFeature, returnPath?: string) => void;
  /**
   * True when the user can use `feature` right now. Otherwise opens the
   * upgrade dialog and returns false: without Premium, and on a free trial
   * that has used up `feature`. While the plan is still loading it lets the
   * user through: the server refuses premium cards on its own.
   */
  requirePremium: (feature?: PremiumFeature, returnPath?: string) => boolean;
}

export const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error("usePremium must be used within a PremiumProvider");
  }
  return context;
};
