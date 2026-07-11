// Pre-launch gate.
//
// While VITE_LAUNCHED !== "true", the whole app is hidden behind the waitlist
// page. Developers can bypass the gate on any browser by visiting the site
// once with ?dev=<VITE_DEV_ACCESS_KEY> in the URL — access persists in
// localStorage. Visit ?dev=off to drop back to the public (waitlist) view.
//
// To launch: set VITE_LAUNCHED="true" in .env and redeploy.
//
// Note: like all VITE_* values, the dev key is baked into the client bundle.
// This is a pre-launch curtain, not hard security — the real app is still
// protected by Supabase auth + RLS.

const DEV_ACCESS_STORAGE_KEY = "phormula.devAccess";

const DEV_ACCESS_KEY: string = import.meta.env.VITE_DEV_ACCESS_KEY || "";

// Process the ?dev= URL param once at startup, before React renders.
function processDevParam(): void {
  const params = new URLSearchParams(window.location.search);
  const dev = params.get("dev");
  if (dev === null) return;

  if (dev === "off") {
    localStorage.removeItem(DEV_ACCESS_STORAGE_KEY);
  } else if (DEV_ACCESS_KEY && dev === DEV_ACCESS_KEY) {
    localStorage.setItem(DEV_ACCESS_STORAGE_KEY, dev);
  }

  // Strip the param so the key doesn't linger in the address bar / history.
  params.delete("dev");
  const query = params.toString();
  const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", cleanUrl);
}

processDevParam();

export function isLaunched(): boolean {
  return import.meta.env.VITE_LAUNCHED === "true";
}

export function hasDevAccess(): boolean {
  if (!DEV_ACCESS_KEY) return false;
  try {
    return localStorage.getItem(DEV_ACCESS_STORAGE_KEY) === DEV_ACCESS_KEY;
  } catch {
    return false;
  }
}

/** True when the full app should be reachable (launched, or dev bypass). */
export function isAppUnlocked(): boolean {
  return isLaunched() || hasDevAccess();
}
