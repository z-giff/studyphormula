import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { PremiumContext, type PremiumContextType } from "@/hooks/usePremium";
import { supabase } from "@/integrations/supabase/client";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import {
  formatPremiumDate,
  hasTrialAvailable,
  isStaleSubscription,
  isTrialLimitedFeature,
  openBillingPortal,
  PREMIUM_FEATURE_NAMES,
  syncPremium,
  TRIAL_USE_LIMIT,
  type PremiumFeature,
  type PremiumStatus,
  type TrialLimitedFeature,
  type TrialUsage,
  type TrialUseClaim,
} from "@/lib/premium";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const onTrial = (status: PremiumStatus | null) => status?.is_premium === true && status.status === "trialing";

// The feature named in ?upgrade=, if it names one
const asFeature = (value: string | null): PremiumFeature | undefined =>
  value && Object.prototype.hasOwnProperty.call(PREMIUM_FEATURE_NAMES, value) ? (value as PremiumFeature) : undefined;

/**
 * Knows whether the signed-in user has Premium, and on a free trial how many
 * of its counted uses are left. Owns the one upgrade dialog, and finishes the
 * round trip to Stripe Checkout: the page Checkout returns to carries
 * ?checkout=success or ?checkout=cancelled.
 */
export const PremiumProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<PremiumStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [trialUsage, setTrialUsage] = useState<TrialUsage | null>(null);
  const [upgrade, setUpgrade] = useState<{ open: boolean; feature?: PremiumFeature; returnPath?: string }>({
    open: false,
  });
  // Only the newest request may set the status, whoever signs in or out meanwhile
  const latestRequest = useRef(0);
  const latestUsageRequest = useRef(0);
  const syncedStale = useRef(false);

  const openUpgrade = useCallback((feature?: PremiumFeature, returnPath?: string) => {
    setUpgrade({
      open: true,
      feature,
      returnPath: returnPath ?? `${window.location.pathname}${window.location.search}`,
    });
  }, []);

  // The trial's counts, for someone on a trial. Until the database has drizzle
  // migration 0016 there are none, and nothing shows a count.
  const loadTrialUsage = useCallback(async (forStatus: PremiumStatus | null) => {
    const request = ++latestUsageRequest.current;
    if (!onTrial(forStatus)) {
      setTrialUsage(null);
      return;
    }
    const { data, error } = await supabase.rpc("get_premium_trial_usage");
    if (request !== latestUsageRequest.current) return;
    if (error) {
      console.error("Failed to load free-trial usage:", error);
      setTrialUsage(null);
      return;
    }
    const usage: Partial<TrialUsage> = {};
    for (const row of data ?? []) {
      if (isTrialLimitedFeature(row.feature)) usage[row.feature] = { uses: row.uses, limit: row.use_limit };
    }
    setTrialUsage(usage as TrialUsage);
  }, []);

  const refresh = useCallback(async (): Promise<PremiumStatus | null> => {
    const request = ++latestRequest.current;
    if (!userId) {
      setStatus(null);
      setTrialUsage(null);
      setStatusLoading(false);
      return null;
    }
    const { data, error } = await supabase.rpc("get_premium_status").maybeSingle();
    if (request !== latestRequest.current) return null;
    setStatusLoading(false);
    if (error) {
      console.error("Failed to load Premium status:", error);
      return null;
    }
    const next = (data as PremiumStatus | null) ?? null;
    setStatus(next);
    await loadTrialUsage(next);
    return next;
  }, [userId, loadTrialUsage]);

  useEffect(() => {
    if (authLoading) return;
    setStatusLoading(true);
    void refresh();
  }, [authLoading, refresh]);

  // A live subscription whose paid period is over means a renewal the webhook
  // never delivered: ask Stripe directly, once per visit.
  useEffect(() => {
    if (syncedStale.current || !isStaleSubscription(status)) return;
    syncedStale.current = true;
    void syncPremium()
      .then(() => refresh())
      .catch((error) => console.error("Failed to re-check Premium with Stripe:", error));
  }, [status, refresh]);

  // Back from Checkout. The webhook usually lands first, but syncing here means
  // the user never sits on a locked screen they just paid to open.
  const confirmCheckout = useCallback(async () => {
    const toastId = toast.loading("Unlocking Premium…");
    for (let attempt = 0; attempt < 5; attempt++) {
      await syncPremium().catch(() => undefined);
      const next = await refresh();
      if (next?.is_premium) {
        const trialEnd = next.status === "trialing" ? next.current_period_end : null;
        toast.success(trialEnd ? "Your free trial has started" : "Welcome to Phormula Premium", {
          id: toastId,
          description: trialEnd
            ? `Premium is unlocked until ${formatPremiumDate(trialEnd)}, with ${TRIAL_USE_LIMIT} uses each of Auto-Flashcard, text detection and the MC Quiz.`
            : "Auto-Flashcard, interactive, flowchart and drawing cards, and the MC Quiz are unlocked, with no limits.",
        });
        return;
      }
      await wait(2000);
    }
    toast.error("We couldn't confirm your payment yet", {
      id: toastId,
      description: "If you were charged, Premium unlocks within a few minutes. Refresh the page to check.",
    });
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    const params = new URLSearchParams(location.search);
    const outcome = params.get("checkout");
    const fromPortal = params.get("billing") === "portal";
    // The trial-ending email's button: straight on to the Stripe billing page
    const toPortal = params.get("billing") === "manage";
    // Open the upgrade dialog on arrival, as when a trial user comes back from
    // adding a card to start their plan
    const upgradeOn = params.get("upgrade");
    if (!outcome && !fromPortal && !toPortal && upgradeOn === null) return;

    // Drop the flags so a refresh or the back button doesn't repeat this
    params.delete("checkout");
    params.delete("billing");
    params.delete("upgrade");
    const search = params.toString();
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : "", hash: location.hash },
      { replace: true, state: location.state },
    );

    if (outcome === "success") void confirmCheckout();
    else if (outcome === "cancelled") toast("Checkout cancelled", { description: "You haven't been charged." });

    // Back from the Customer Portal: a card added, a plan switched or a
    // cancellation shows straight away rather than when the webhook lands
    if (fromPortal) {
      void syncPremium()
        .then(() => refresh())
        .catch((error) => console.error("Failed to re-check Premium with Stripe:", error))
        .finally(() => {
          if (upgradeOn !== null) openUpgrade(asFeature(upgradeOn));
        });
    } else if (upgradeOn !== null) {
      openUpgrade(asFeature(upgradeOn));
    }

    if (toPortal) {
      void openBillingPortal(`${location.pathname}${search ? `?${search}` : ""}`).catch((error) =>
        toast.error(error instanceof Error ? error.message : "Couldn't open billing"),
      );
    }
  }, [userId, location, navigate, confirmCheckout, refresh, openUpgrade]);

  const isPremium = status?.is_premium === true;
  const isTrial = onTrial(status);
  const loading = authLoading || statusLoading;

  const refreshTrialUsage = useCallback(() => loadTrialUsage(status), [loadTrialUsage, status]);

  const trialUsesLeft = useCallback(
    (feature: TrialLimitedFeature) => {
      const counted = isTrial ? trialUsage?.[feature] : undefined;
      return counted ? Math.max(counted.limit - counted.uses, 0) : null;
    },
    [isTrial, trialUsage],
  );

  const claimTrialUse = useCallback(
    async (feature: TrialLimitedFeature): Promise<TrialUseClaim> => {
      const { data, error } = await supabase.rpc("claim_premium_feature_use", { p_feature: feature });
      if (error) throw error;
      // Fresh counts before the caller shows what's left
      await loadTrialUsage(status);
      return data as TrialUseClaim;
    },
    [loadTrialUsage, status],
  );

  const requirePremium = useCallback(
    (feature?: PremiumFeature, returnPath?: string) => {
      if (loading) return true;
      // No Premium, or a free trial that has used this feature up
      if (!isPremium || (isTrialLimitedFeature(feature) && trialUsesLeft(feature) === 0)) {
        openUpgrade(feature, returnPath);
        return false;
      }
      return true;
    },
    [isPremium, loading, openUpgrade, trialUsesLeft],
  );

  const value = useMemo<PremiumContextType>(
    () => ({
      isPremium,
      loading,
      status,
      isTrial,
      trialUsage,
      trialUsesLeft,
      refresh,
      refreshTrialUsage,
      claimTrialUse,
      openUpgrade,
      requirePremium,
    }),
    [isPremium, loading, status, isTrial, trialUsage, trialUsesLeft, refresh, refreshTrialUsage, claimTrialUse, openUpgrade, requirePremium],
  );

  return (
    <PremiumContext.Provider value={value}>
      {children}
      <UpgradeDialog
        open={upgrade.open}
        onOpenChange={(open) => setUpgrade((prev) => ({ ...prev, open }))}
        feature={upgrade.feature}
        returnPath={upgrade.returnPath ?? "/dashboard"}
        isPremium={isPremium}
        isTrial={isTrial}
        trialUsage={trialUsage}
        billingInterval={status?.billing_interval ?? null}
        billingIntervalCount={status?.billing_interval_count ?? null}
        hasBillingAccount={status?.has_billing_account ?? false}
        trialAvailable={hasTrialAvailable(status)}
        onAlreadyPremium={refresh}
        onPlanChanged={refresh}
      />
    </PremiumContext.Provider>
  );
};
