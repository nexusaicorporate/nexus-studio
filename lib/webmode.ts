// True only in the hosted web SaaS build (set NEXT_PUBLIC_WEB_MODE=1 there).
// The desktop static build leaves it unset, so all auth/billing UI stays hidden
// and the app behaves exactly as before.
export const WEB_MODE = process.env.NEXT_PUBLIC_WEB_MODE === "1";
