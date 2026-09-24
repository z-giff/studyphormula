import { createContext, useContext } from "react";
import type { PremiumFeature, PremiumStatus } from "@/lib/premium";

export interface PremiumContextType {
  /** The signed-in user has Premium. False until their plan has loaded. */
  isPremium: boolean;
  /** Still finding out. Lock nothing on screen until this is false. */
  loading: boolean;
  status: PremiumStatus | null;
  refresh: () => Promise<PremiumStatus | null>;
  /**
   * Open the upgrade dialog. `returnPath` is where Stripe Checkout sends the
   * user back to once they've paid; it defaults to the page they're on.
   */
  openUpgrade: (feature?: PremiumFeature, returnPath?: string) => void;
  /**
   * True when the user can use `feature` right now. Otherwise opens the
   * upgrade dialog and returns false. While the plan is still loading it lets
   * the user through: the server refuses premium cards on its own.
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
