import DOMPurify from "isomorphic-dompurify";

export function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "ul", "ol", "li", "p", "br"],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOW_UNKNOWN_PROTOCOLS: false,
    FORBID_TAGS: ["script", "style"],
    FORBID_ATTR: ["onerror", "onclick", "onload", "style"],
  });
}
