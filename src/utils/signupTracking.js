const MEASUREMENT_ID = "G-7P327WF7Y8";
const TEST_MODE_KEY = "marketlence.analytics.testMode";
const trackedAccounts = new Set();

// Funnel events contain no email, name, token, resume, or other personal data.
// They show where a visitor stops before completing a registration.
export function trackSignupFunnel(eventName, parameters = {}, browser = globalThis.window) {
  if (!browser || !/^signup_(view|google_started|google_failed|otp_sent|otp_failed|otp_verified|onboarding_view|onboarding_complete)$/.test(eventName)) return false;

  try {
    const testMode = new URL(browser.location.href).searchParams.get("ml_test");
    if (testMode === "1") browser.sessionStorage.setItem(TEST_MODE_KEY, "1");
    if (testMode === "0") browser.sessionStorage.removeItem(TEST_MODE_KEY);
    if (testMode === "1" || browser.sessionStorage.getItem(TEST_MODE_KEY) === "1") return false;
    if (browser.location.hostname !== "jobs.marketlence.com" || typeof browser.gtag !== "function") return false;
    browser.gtag("event", eventName, { send_to: MEASUREMENT_ID, ...parameters, transport_type: "beacon" });
    return true;
  } catch {
    return false;
  }
}

// Analytics must never prevent account creation or sign-in.
export function trackSignup(data, { accountType, method, surface }, browser = globalThis.window) {
  if (!browser || data?.isNewUser !== true) return false;
  if (!["candidate", "employer"].includes(accountType)) return false;
  if (!["email", "google"].includes(method)) return false;
  if ((accountType === "candidate" && data.role !== "user") ||
      (accountType === "employer" && data.role !== "employer")) return false;

  try {
    // Explicitly opt testing out on the production site; this persists in this tab.
    const testMode = new URL(browser.location.href).searchParams.get("ml_test");
    if (testMode === "1") browser.sessionStorage.setItem(TEST_MODE_KEY, "1");
    if (testMode === "0") browser.sessionStorage.removeItem(TEST_MODE_KEY);
    if (testMode === "1" || browser.sessionStorage.getItem(TEST_MODE_KEY) === "1") return false;
    if (browser.location.hostname !== "jobs.marketlence.com") return false;
    if (typeof browser.gtag !== "function") return false;

    // The ID stays in this browser; it is never sent to Google.
    const key = `${accountType}:${data.userId}`;
    if (data.userId == null || trackedAccounts.has(key) ||
        browser.sessionStorage.getItem(`marketlence.signup.${key}`)) return false;

    const parameters = { send_to: MEASUREMENT_ID, method, account_type: accountType, ...(surface ? { signup_surface: surface } : {}), transport_type: "beacon" };
    browser.gtag("event", "sign_up", parameters);
    browser.gtag("event", `${accountType}_signup`, parameters);
    trackedAccounts.add(key);
    browser.sessionStorage.setItem(`marketlence.signup.${key}`, "1");
    return true;
  } catch {
    return false;
  }
}
