import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, GitBranch, Layers, Loader2, Signature, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QuizIcon } from "@/components/StudyModeIcons";
import { cn } from "@/lib/utils";
import {
  BillingError,
  fetchPricing,
  formatPrice,
  isTrialLimitedFeature,
  openBillingPortal,
  planFor,
  PREMIUM_FEATURE_NAMES,
  previewStartPlan,
  startCheckout,
  startPlanNow,
  billingPeriod,
  monthsPerPayment,
  PLAN_NAMES,
  TRIAL_LIMITS_SENTENCE,
  TRIAL_USE_LIMIT,
  trialUseNoun,
  type PlanId,
  type PremiumFeature,
  type PricingPlan,
  type StartPlanPreview,
  type TrialLimitedFeature,
  type TrialUsage,
} from "@/lib/premium";

// The card and quiz lines match the homepage's card-type showcase
const UNLOCKS = [
  { feature: "auto_flashcard", Icon: Sparkles, line: "Turn your notes and PDFs into cards." },
  { feature: "interactive", Icon: Layers, line: "Label the image from memory." },
  { feature: "flowchart", Icon: GitBranch, line: "See how it connects." },
  { feature: "drawing", Icon: Signature, line: "Sketch it to remember it." },
  { feature: "quiz", Icon: QuizIcon, line: "Test what you remember." },
] as const;

// What a free trial counts, with the icons the app's buttons use
const TRIAL_COUNTED = [
  { feature: "auto_flashcard", Icon: Sparkles },
  { feature: "text_detection", Icon: Wand2 },
  { feature: "quiz", Icon: QuizIcon },
] as const;

// The dialog starts on the longest plan on offer
const PLAN_PREFERENCE: PlanId[] = ["yearly", "two_semesters", "semester", "monthly"];

// The heading's first line when the dialog opened on a particular feature
const FEATURE_LEADS: Record<PremiumFeature, string> = {
  interactive: "Interactive cards are part of Premium.",
  flowchart: "Flowchart cards are part of Premium.",
  drawing: "Drawing cards are part of Premium.",
  quiz: "The MC Quiz is part of Premium.",
  auto_flashcard: "Auto-Flashcard is part of Premium.",
  text_detection: "Text detection is part of Premium.",
};

// How much cheaper a longer plan is than paying monthly for the same months
function savingOverMonthly(plan: PricingPlan, plans: PricingPlan[]): number | null {
  const monthly = plans.find((p) => p.plan === "monthly");
  const months = monthsPerPayment(plan.interval, plan.intervalCount);
  if (!monthly?.amount || !plan.amount || !months || months <= 1 || monthly.currency !== plan.currency) return null;
  const saving = Math.round((1 - plan.amount / (monthly.amount * months)) * 100);
  return saving > 0 ? saving : null;
}

// "$4.50 a month" for a plan that covers several months
function perMonth(plan: PricingPlan): string | null {
  const months = monthsPerPayment(plan.interval, plan.intervalCount);
  if (!plan.amount || !months || months <= 1) return null;
  return `${formatPrice(Math.round(plan.amount / months), plan.currency)} a month`;
}

// The same page with one more query parameter
function withParam(path: string, key: string, value: string): string {
  const url = new URL(path, window.location.origin);
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What the user reached for, to name it in the heading. */
  feature?: PremiumFeature;
  /** Where Checkout comes back to. */
  returnPath: string;
  isPremium: boolean;
  /** Premium on a free trial: the dialog offers to start the paid plan now. */
  isTrial: boolean;
  trialUsage: TrialUsage | null;
  /** How often the plan bills: "month" and 4 for a semester. */
  billingInterval: string | null;
  billingIntervalCount: number | null;
  hasBillingAccount: boolean;
  /** Neither the account nor its email address has subscribed, so a free trial is theirs if one is on offer. */
  trialAvailable: boolean;
  /** Checkout found a subscription we hadn't heard about yet. */
  onAlreadyPremium: () => void;
  /** The trial turned into the paid plan: just now, or already, in another tab. */
  onPlanChanged: () => Promise<unknown>;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  feature,
  returnPath,
  isPremium,
  isTrial,
  trialUsage,
  billingInterval,
  billingIntervalCount,
  hasBillingAccount,
  trialAvailable,
  onAlreadyPremium,
  onPlanChanged,
}: UpgradeDialogProps) {
  const [plans, setPlans] = useState<PricingPlan[] | null>(null);
  const [trialDays, setTrialDays] = useState(0);
  const [pricingError, setPricingError] = useState<BillingError | null>(null);
  const [selected, setSelected] = useState<PlanId>("yearly");
  const [isRedirecting, setIsRedirecting] = useState(false);
  // On a free trial: what starting the plan now charges
  const [startPreview, setStartPreview] = useState<StartPlanPreview | null>(null);
  const [startPreviewError, setStartPreviewError] = useState<BillingError | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const loadPricing = useCallback(() => {
    setPricingError(null);
    fetchPricing()
      .then((pricing) => {
        setPlans(pricing.plans);
        setTrialDays(pricing.trialDays);
        const start = PLAN_PREFERENCE.find((id) => pricing.plans.some((p) => p.plan === id));
        if (start) setSelected(start);
      })
      .catch((error) => setPricingError(error instanceof BillingError ? error : new BillingError(String(error))));
  }, []);

  // Asked each time the dialog opens: a card added since changes the answer
  const loadStartPreview = useCallback(() => {
    setStartPreviewError(null);
    previewStartPlan()
      .then(setStartPreview)
      .catch((error) => {
        // The trial is over already: the dialog turns to the plan they have
        if (error instanceof BillingError && error.code === "not_trialing") void onPlanChanged();
        setStartPreviewError(error instanceof BillingError ? error : new BillingError(String(error)));
      });
  }, [onPlanChanged]);

  useEffect(() => {
    if (open && !plans && !pricingError) loadPricing();
    if (!open) {
      setIsRedirecting(false);
      // Ask again next time it opens
      setPricingError(null);
    }
  }, [open, plans, pricingError, loadPricing]);

  useEffect(() => {
    if (open && isTrial) loadStartPreview();
    if (!open) {
      setStartPreview(null);
      setStartPreviewError(null);
    }
  }, [open, isTrial, loadStartPreview]);

  const handleCheckout = async () => {
    setIsRedirecting(true);
    try {
      await startCheckout(selected, returnPath);
      // The browser is on its way to Stripe; leave the button spinning
    } catch (error) {
      setIsRedirecting(false);
      if (error instanceof BillingError && error.code === "already_premium") {
        toast.success("You already have Phormula Premium");
        onAlreadyPremium();
        onOpenChange(false);
        return;
      }
      toast.error(error instanceof Error ? error.message : "Couldn't open checkout");
    }
  };

  const handleManage = async () => {
    setIsRedirecting(true);
    try {
      await openBillingPortal(returnPath);
    } catch (error) {
      setIsRedirecting(false);
      toast.error(error instanceof Error ? error.message : "Couldn't open billing");
    }
  };

  // Stripe's billing page comes back here, and this dialog opens again to start the plan
  const handleAddCard = async () => {
    setIsRedirecting(true);
    try {
      await openBillingPortal(withParam(returnPath, "upgrade", feature ?? "plan"));
    } catch (error) {
      setIsRedirecting(false);
      toast.error(error instanceof Error ? error.message : "Couldn't open billing");
    }
  };

  const handleStartPlan = async () => {
    setIsStarting(true);
    try {
      await startPlanNow();
      onOpenChange(false);
      toast.success("Your plan has started", {
        description: "Auto-Flashcard, text detection and the MC Quiz have no limits now.",
      });
      await onPlanChanged();
    } catch (error) {
      if (error instanceof BillingError && error.code === "payment_method_required") {
        setStartPreview((prev) => prev && { ...prev, hasPaymentMethod: false });
      } else {
        toast.error(error instanceof Error ? error.message : "Couldn't start your plan");
      }
    } finally {
      setIsStarting(false);
    }
  };

  const notForSale = pricingError?.code === "not_configured";
  const offersTrial = !isPremium && trialAvailable && trialDays > 0;

  const usesLeft = (counted: TrialLimitedFeature) => {
    const usage = trialUsage?.[counted];
    return usage ? Math.max(usage.limit - usage.uses, 0) : null;
  };
  const usedUp = isTrialLimitedFeature(feature) && usesLeft(feature) === 0 ? feature : null;

  const lead = feature ? FEATURE_LEADS[feature] : "Study the way you think, with every card type and study mode.";
  const title = isTrial ? "Your Phormula Premium trial" : isPremium ? "You have Phormula Premium" : "Phormula Premium";
  const description = isTrial
    ? usedUp
      ? `You've used all ${TRIAL_USE_LIMIT} ${trialUseNoun(usedUp, TRIAL_USE_LIMIT)} in your free trial. Start your plan now to keep going, with no limits.`
      : `Your free trial includes ${TRIAL_USE_LIMIT} uses each of Auto-Flashcard, text detection and the MC Quiz. Start your plan now to use them as much as you like.`
    : isPremium
      ? "Everything below is unlocked on your account, with no limits."
      : offersTrial
        ? `${lead} Try it free for ${trialDays} days, no card needed.`
        : feature
          ? `${lead} Here's everything it unlocks.`
          : lead;

  // "every year", "every 4 months"
  const period = billingPeriod(billingInterval, billingIntervalCount);
  const renewsEvery = period.startsWith("per ") ? `every ${period.slice(4)}` : period;
  const planId = planFor(billingInterval, billingIntervalCount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl">
        <DialogHeader className="px-8 pt-8 pb-5 space-y-3">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-primary-foreground [background-image:var(--gradient-primary)] shadow-[var(--glow-ember)]"
            aria-hidden
          >
            <Crown className="h-5 w-5" />
          </div>
          <DialogTitle className="text-center text-xl font-semibold tracking-tight">{title}</DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="px-8 pb-6 space-y-6">
          {isTrial ? (
            <>
              <ul className="space-y-3" aria-label="Left in your free trial">
                {TRIAL_COUNTED.map(({ feature: counted, Icon }) => {
                  const left = usesLeft(counted);
                  return (
                    <li
                      key={counted}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border px-4 py-3",
                        counted === feature ? "border-primary/60 bg-accent" : "border-border",
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.7} />
                      <p className="min-w-0 flex-1 text-sm font-medium">{PREMIUM_FEATURE_NAMES[counted]}</p>
                      <p className={cn("shrink-0 text-xs", left === 0 ? "font-semibold text-primary" : "text-muted-foreground")}>
                        {left === null ? `${TRIAL_USE_LIMIT} in your trial` : `${left} of ${TRIAL_USE_LIMIT} left`}
                      </p>
                    </li>
                  );
                })}
              </ul>

              {startPreviewError ? (
                <div className="rounded-xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
                  <p>Couldn't load what your plan costs.</p>
                  <Button variant="link" size="sm" onClick={loadStartPreview}>
                    Try again
                  </Button>
                </div>
              ) : !startPreview ? (
                <Skeleton className="h-[92px] rounded-xl" aria-label="Loading your plan" />
              ) : (
                <div className="flex flex-col items-start gap-0.5 rounded-xl border border-primary bg-accent px-4 py-3 shadow-[var(--glow-ember)]">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {planId ? `${PLAN_NAMES[planId]} plan` : "Your plan"} · today
                  </span>
                  <span className="text-2xl font-semibold">{formatPrice(startPreview.amount, startPreview.currency)}</span>
                  {renewsEvery && (
                    <span className="text-xs text-muted-foreground">Then it renews {renewsEvery} until you cancel.</span>
                  )}
                </div>
              )}

              <div className="space-y-3">
                {startPreview && !startPreview.hasPaymentMethod ? (
                  <Button
                    variant="brand"
                    size="lg"
                    className="w-full rounded-xl font-bold"
                    onClick={handleAddCard}
                    disabled={isRedirecting}
                  >
                    {isRedirecting && <Loader2 className="animate-spin" />}
                    Add a card
                  </Button>
                ) : (
                  <Button
                    variant="brand"
                    size="lg"
                    className="w-full rounded-xl font-bold"
                    onClick={handleStartPlan}
                    disabled={!startPreview || isStarting}
                  >
                    {isStarting && <Loader2 className="animate-spin" />}
                    Start my plan now
                  </Button>
                )}
                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  {startPreview && !startPreview.hasPaymentMethod
                    ? "Add a card on Stripe's billing page, then come back here to start your plan. "
                    : "Starting your plan ends your free trial today and charges your card the amount above. "}
                  Cancel anytime from your profile. Payment is handled securely by Stripe. By continuing you agree to
                  the{" "}
                  <Link to="/terms" className="underline underline-offset-2 hover:text-foreground" target="_blank">
                    Terms of Service
                  </Link>
                  .
                </p>
              </div>
            </>
          ) : (
            <>
              <ul className="space-y-3">
                {UNLOCKS.map(({ feature: unlock, Icon, line }) => (
                  <li
                    key={unlock}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-4 py-3",
                      unlock === feature ? "border-primary/60 bg-accent" : "border-border",
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.7} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{PREMIUM_FEATURE_NAMES[unlock]}</p>
                      <p className="text-xs text-muted-foreground">{line}</p>
                    </div>
                  </li>
                ))}
              </ul>

              {isPremium ? (
                hasBillingAccount && (
                  <Button variant="outline" className="w-full" onClick={handleManage} disabled={isRedirecting}>
                    {isRedirecting && <Loader2 className="animate-spin" />}
                    Manage billing
                  </Button>
                )
              ) : (
                <>
                  {notForSale ? (
                    <p className="rounded-xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
                      Premium isn't available to buy just yet. Check back soon.
                    </p>
                  ) : pricingError ? (
                    <div className="rounded-xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
                      <p>Couldn't load prices.</p>
                      <Button variant="link" size="sm" onClick={loadPricing}>
                        Try again
                      </Button>
                    </div>
                  ) : !plans ? (
                    <div className="grid grid-cols-2 gap-3" aria-label="Loading prices">
                      <Skeleton className="h-[92px] rounded-xl" />
                      <Skeleton className="h-[92px] rounded-xl" />
                    </div>
                  ) : (
                    <div
                      role="radiogroup"
                      aria-label="Billing period"
                      className={cn("grid gap-3", plans.length > 1 ? "grid-cols-2" : "grid-cols-1")}
                    >
                      {plans.map((plan) => {
                        const isSelected = plan.plan === selected;
                        const saving = savingOverMonthly(plan, plans);
                        const monthly = perMonth(plan);
                        return (
                          <button
                            key={plan.plan}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => setSelected(plan.plan)}
                            className={cn(
                              "flex flex-col items-start gap-0.5 rounded-xl border px-4 py-3 text-left transition-colors",
                              isSelected
                                ? "border-primary bg-accent shadow-[var(--glow-ember)]"
                                : "border-line-strong hover:border-primary/50",
                            )}
                          >
                            {/* The pill drops under the name when the card is too narrow for both */}
                            <span className="flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1">
                              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {PLAN_NAMES[plan.plan]}
                              </span>
                              {saving && (
                                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-primary-foreground [background-image:var(--gradient-primary)]">
                                  Save {saving}%
                                </span>
                              )}
                            </span>
                            <span className="text-2xl font-semibold">
                              {plan.amount === null ? "See checkout" : formatPrice(plan.amount, plan.currency)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {billingPeriod(plan.interval, plan.intervalCount)}
                            </span>
                            {monthly && <span className="text-xs text-muted-foreground/80">{monthly}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {!notForSale && (
                    <div className="space-y-3">
                      {offersTrial && (
                        <p className="rounded-xl bg-muted/60 px-4 py-3 text-center text-xs leading-relaxed text-muted-foreground">
                          {TRIAL_LIMITS_SENTENCE}
                        </p>
                      )}
                      <Button
                        variant="brand"
                        size="lg"
                        className="w-full rounded-xl font-bold"
                        onClick={handleCheckout}
                        disabled={!plans || isRedirecting}
                      >
                        {isRedirecting && <Loader2 className="animate-spin" />}
                        {offersTrial ? `Start ${trialDays}-day free trial` : "Continue to checkout"}
                      </Button>
                      <p className="text-center text-xs leading-relaxed text-muted-foreground">
                        {offersTrial
                          ? `Free for ${trialDays} days, no card needed. To keep Premium after that, add a card from your profile; it then renews at the price above until you cancel.`
                          : "Renews automatically until you cancel. Cancel anytime from your profile."}{" "}
                        Payment is handled securely by Stripe. By continuing you agree to the{" "}
                        <Link to="/terms" className="underline underline-offset-2 hover:text-foreground" target="_blank">
                          Terms of Service
                        </Link>
                        .
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
