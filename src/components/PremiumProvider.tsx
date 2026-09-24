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
  openBillingPortal,
  syncPremium,
  type PremiumFeature,
  type PremiumStatus,
} from "@/lib/premium";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Knows whether the signed-in user has Premium, owns the one upgrade dialog,
 * and finishes the round trip to Stripe Checkout: the page Checkout returns
 * to carries ?checkout=success or ?checkout=cancelled.
 */
export const PremiumProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<PremiumStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [upgrade, setUpgrade] = useState<{ open: boolean; feature?: PremiumFeature; returnPath?: string }>({
    open: false,
  });
  // Only the newest request may set the status, whoever signs in or out meanwhile
  const latestRequest = useRef(0);
  const syncedStale = useRef(false);

  const refresh = useCallback(async (): Promise<PremiumStatus | null> => {
    const request = ++latestRequest.current;
    if (!userId) {
      setStatus(null);
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
    return next;
  }, [userId]);

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
            ? `Interactive, flowchart and drawing cards and the MC Quiz are unlocked until ${formatPremiumDate(trialEnd)}.`
            : "Interactive, flowchart and drawing cards and the MC Quiz are unlocked.",
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
    if (!outcome && !fromPortal && !toPortal) return;

    // Drop the flags so a refresh or the back button doesn't repeat this
    params.delete("checkout");
    params.delete("billing");
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
        .catch((error) => console.error("Failed to re-check Premium with Stripe:", error));
    }

    if (toPortal) {
      void openBillingPortal(`${location.pathname}${search ? `?${search}` : ""}`).catch((error) =>
        toast.error(error instanceof Error ? error.message : "Couldn't open billing"),
      );
    }
  }, [userId, location, navigate, confirmCheckout, refresh]);

  const isPremium = status?.is_premium === true;
  const loading = authLoading || statusLoading;

  const openUpgrade = useCallback((feature?: PremiumFeature, returnPath?: string) => {
    setUpgrade({
      open: true,
      feature,
      returnPath: returnPath ?? `${window.location.pathname}${window.location.search}`,
    });
  }, []);

  const requirePremium = useCallback(
    (feature?: PremiumFeature, returnPath?: string) => {
      if (isPremium || loading) return true;
      openUpgrade(feature, returnPath);
      return false;
    },
    [isPremium, loading, openUpgrade],
  );

  const value = useMemo<PremiumContextType>(
    () => ({ isPremium, loading, status, refresh, openUpgrade, requirePremium }),
    [isPremium, loading, status, refresh, openUpgrade, requirePremium],
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
        hasBillingAccount={status?.has_billing_account ?? false}
        trialAvailable={hasTrialAvailable(status)}
        onAlreadyPremium={refresh}
      />
    </PremiumContext.Provider>
  );
};
