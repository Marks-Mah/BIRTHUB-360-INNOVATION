export function resolveGatewayProxyPath(originalUrl: string): string {
  if (originalUrl === "/webhooks/stripe" || originalUrl.startsWith("/webhooks/stripe?")) {
    return originalUrl.replace("/webhooks/stripe", "/api/webhooks/stripe");
  }

  return originalUrl;
}
