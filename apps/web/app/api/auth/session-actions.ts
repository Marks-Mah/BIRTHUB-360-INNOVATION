export function isSupportedSessionAction(action: string | undefined): boolean {
  return ["signin", "signout", "refresh", "mfa", "session"].includes(action ?? "");
}
