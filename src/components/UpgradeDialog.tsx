import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, GitBranch, Layers, Loader2, Signature } from "lucide-react";
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
  openBillingPortal,
  PREMIUM_FEATURE_NAMES,
  startCheckout,
  billingPeriod,
  monthsPerPayment,
  PLAN_NAMES,
  type PlanId,
  type PremiumFeature,
  type PricingPlan,
} from "@/lib/premium";

// Same lines as the homepage's card-type showcase
const UNLOCKS = [
  { feature: "interactive", Icon: Layers, line: "Label the image from memory." },
  { feature: "flowchart", Icon: GitBranch, line: "See how it connects." },
  { feature: "drawing", Icon: Signature, line: "Sketch it to remember it." },
  { feature: "quiz", Icon: QuizIcon, line: "Test what you remember." },
] as const;

// The dialog starts on the longest plan on offer
const PLAN_PREFERENCE: PlanId[] = ["yearly", "two_semesters", "semester", "monthly"];

// The heading's first line when the dialog opened on a particular feature
const FEATURE_LEADS: Record<PremiumFeature, string> = {
  interactive: "Interactive cards are part of Premium.",
  flowchart: "Flowchart cards are part of Premium.",
  drawing: "Drawing cards are part of Premium.",
  quiz: "The MC Quiz is part of Premium.",
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

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What the user reached for, to name it in the heading. */
  feature?: PremiumFeature;
  /** Where Checkout comes back to. */
  returnPath: string;
  isPremium: boolean;
  hasBillingAccount: boolean;
  /** Neither the account nor its email address has subscribed, so a free trial is theirs if one is on offer. */
  trialAvailable: boolean;
  /** Checkout found a subscription we hadn't heard about yet. */
  onAlreadyPremium: () => void;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  feature,
  returnPath,
  isPremium,
  hasBillingAccount,
  trialAvailable,
  onAlreadyPremium,
}: UpgradeDialogProps) {
  const [plans, setPlans] = useState<PricingPlan[] | null>(null);
  const [trialDays, setTrialDays] = useState(0);
  const [pricingError, setPricingError] = useState<BillingError | null>(null);
  const [selected, setSelected] = useState<PlanId>("yearly");
  const [isRedirecting, setIsRedirecting] = useState(false);

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

  useEffect(() => {
    if (open && !plans && !pricingError) loadPricing();
    if (!open) {
      setIsRedirecting(false);
      // Ask again next time it opens
      setPricingError(null);
    }
  }, [open, plans, pricingError, loadPricing]);

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

  const notForSale = pricingError?.code === "not_configured";
  const offersTrial = !isPremium && trialAvailable && trialDays > 0;

  const lead = feature ? FEATURE_LEADS[feature] : "Study the way you think, with every card type and study mode.";
  const description = isPremium
    ? "Everything below is unlocked on your account."
    : offersTrial
      ? `${lead} Try it free for ${trialDays} days, no card needed.`
      : feature
        ? `${lead} Here's everything it unlocks.`
        : lead;

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
          <DialogTitle className="text-center text-xl font-semibold tracking-tight">
            {isPremium ? "You have Phormula Premium" : "Phormula Premium"}
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="px-8 pb-6 space-y-6">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
