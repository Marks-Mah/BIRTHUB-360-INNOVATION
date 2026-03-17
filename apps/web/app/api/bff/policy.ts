export const ALLOWED_BFF_PREFIXES = [
  "api/v1/auth",
  "api/v1/billing",
  "api/v1/workflows",
  "api/v1/outputs"
] as const;

export function isBffPathAllowed(path: string): boolean {
  return ALLOWED_BFF_PREFIXES.some((prefix) => path.startsWith(prefix));
}
