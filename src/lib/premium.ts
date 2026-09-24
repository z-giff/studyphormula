import { supabase } from "@/integrations/supabase/client";

/**
 * Phormula Premium, from the app's side. What it unlocks is decided here and
 * enforced again on the server: the database refuses premium cards from anyone
 * without it (enforce_premium_flashcard_types), and text detection checks too.
 * Payment itself happens on Stripe's pages, through the billing edge function.
 */

/** Card types that need Premium to make, edit or study. */
export const PREMIUM_CARD_TYPES = ["interactive", "flowchart", "drawing"] as const;
export type PremiumCardType = (typeof PREMIUM_CARD_TYPES)[number];

export const isPremiumCardType = (type: string | null | undefined): type is PremiumCardType =>
  (PREMIUM_CARD_TYPES as readonly (string | null | undefined)[]).includes(type);

/** What the user reached for when the upgrade dialog opened. */
export type PremiumFeature = PremiumCardType | "quiz";

export const PREMIUM_FEATURE_NAMES: Record<PremiumFeature, string> = {
  interactive: "Interactive cards",
  flowchart: "Flowchart cards",
  drawing: "Drawing cards",
  quiz: "MC Quiz",
};

export const PREMIUM_CARD_NAMES: Record<PremiumCardType, string> = {
  interactive: "Interactive card",
  flowchart: "Flowchart card",
  drawing: "Drawing card",
};

/** Stripe statuses that still unlock Premium. Mirrors public.user_has_premium(). */
const LIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export type BillingInterval = "month" | "year";

/** The signed-in user's plan, as get_premium_status() reports it. */
export interface PremiumStatus {
  is_premium: boolean;
  status: string | null;
  billing_interval: string | null;
  current_period_end: string | null;
  cancel_at: string | null;
  /** There is a Stripe customer to manage (not so for Premium granted by hand). */
  has_billing_account: boolean;
}

export interface PricingPlan {
  interval: BillingInterval;
  /** In the currency's smallest unit, as Stripe gives it (cents for USD). */
  amount: number | null;
  currency: string;
}

/** A save the database refused because the card type needs Premium. */
export const isPremiumRequiredError = (error: unknown): boolean =>
  typeof error === "object" && error !== null && (error as { hint?: unknown }).hint === "premium_required";

/**
 * The stored subscription says it is live but its paid period is over: a
 * renewal the webhook never delivered. Worth re-reading from Stripe.
 */
export const isStaleSubscription = (status: PremiumStatus | null): boolean =>
  !!status?.has_billing_account &&
  LIVE_STATUSES.has(status.status ?? "") &&
  !!status.current_period_end &&
  new Date(status.current_period_end).getTime() < Date.now();

export class BillingError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

// The billing edge function answers failures as { error, code }
async function invokeBilling<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("billing", { body });
  if (!error) return data as T;
  const response = (error as { context?: unknown }).context;
  if (response instanceof Response) {
    const payload = await response.json().catch(() => null);
    if (typeof payload?.error === "string") throw new BillingError(payload.error, payload.code);
  }
  throw new BillingError("Something went wrong. Please try again.");
}

export const fetchPricing = async (): Promise<PricingPlan[]> =>
  (await invokeBilling<{ plans: PricingPlan[] }>({ action: "pricing" })).plans;

/** Go to Stripe Checkout. It comes back to `returnPath` with ?checkout=success or ?checkout=cancelled. */
export async function startCheckout(interval: BillingInterval, returnPath: string): Promise<void> {
  const { url } = await invokeBilling<{ url: string }>({ action: "checkout", interval, returnPath });
  window.location.assign(url);
}

/** Go to the Stripe Customer Portal: cancel, change card, invoices. */
export async function openBillingPortal(returnPath: string): Promise<void> {
  const { url } = await invokeBilling<{ url: string }>({ action: "portal", returnPath });
  window.location.assign(url);
}

/** Re-read the signed-in user's subscription from Stripe now, rather than waiting on the webhook. */
export const syncPremium = () => invokeBilling<{ isPremium: boolean }>({ action: "sync" });

/** "$5", "$4.99", "¥600": Stripe amounts are in the smallest unit, which is the whole yen for JPY. */
export function formatPrice(amount: number, currency: string): string {
  const code = currency.toUpperCase();
  const digits = new Intl.NumberFormat("en-US", { style: "currency", currency: code }).resolvedOptions()
    .maximumFractionDigits ?? 2;
  const value = amount / 10 ** digits;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    minimumFractionDigits: Number.isInteger(value) ? 0 : digits,
  }).format(value);
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

/** One line about where the user's Premium stands, for the profile. */
export function describePremiumStatus(status: PremiumStatus): string {
  if (!status.is_premium) {
    if (!status.status) return "";
    if (status.status === "incomplete") return "Your payment didn't go through.";
    if (status.status === "paused") return "Your Premium is paused.";
    return "Your Premium has ended.";
  }
  if (status.status === "past_due") {
    return "Your last payment didn't go through. Update your card to keep Premium.";
  }
  if (status.cancel_at) {
    return `Premium until ${formatDate(status.cancel_at)}. It won't renew.`;
  }
  if (!status.current_period_end) {
    return "Premium with no end date.";
  }
  if (status.status === "trialing") {
    return `Free trial until ${formatDate(status.current_period_end)}.`;
  }
  const billed = status.billing_interval === "year" ? "yearly" : "monthly";
  return `Renews ${formatDate(status.current_period_end)}, billed ${billed}.`;
}
