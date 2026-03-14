export const SESSION_COOKIE = "birthub_dashboard_session";

export function getSessionToken() {
  return process.env.DASHBOARD_SESSION_TOKEN ?? "birthub-demo-session";
}

export function isValidSessionToken(token?: string) {
  return Boolean(token) && token === getSessionToken();
}
