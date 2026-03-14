import DOMPurify from "isomorphic-dompurify";

export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "ul", "ol", "li", "p", "br"], ALLOWED_ATTR: ["href", "target", "rel"] });
}

export function createRateLimiter(max: number, windowMs: number) {
  const store = new Map<string, number[]>();
  return (key: string): boolean => {
    const now = Date.now();
    const items = (store.get(key) || []).filter((t) => now - t < windowMs);
    items.push(now);
    store.set(key, items);
    return items.length <= max;
  };
}

const secretPatterns = [/AKIA[0-9A-Z]{16}/, /sk_live_[A-Za-z0-9]{20,}/, /-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/, /AIza[0-9A-Za-z\-_]{35}/];
export function scanSecrets(content: string): void {
  for (const pattern of secretPatterns) {
    if (pattern.test(content)) throw new Error(`secret_pattern_detected:${pattern}`);
  }
}

export function buildCspHeader(directives: Record<string, string[]>): string {
  return Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`).join("; ");
}
