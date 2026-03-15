export const SESSION_COOKIE = "birthub_dashboard_session";

export function getSessionToken() {
  const token = process.env.DASHBOARD_SESSION_TOKEN?.trim();

  if (!token) {
    throw new Error("DASHBOARD_SESSION_TOKEN_MISSING");
  }

  return token;
}

export function isValidSessionToken(token?: string) {
  try {
    return Boolean(token) && token === getSessionToken();
  } catch {
    return false;
  }
}
