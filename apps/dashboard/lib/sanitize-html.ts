"use client";

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  doc.querySelectorAll("script, iframe, object, embed").forEach((node) => node.remove());

  doc.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((attr) => {
      if (attr.name.toLowerCase().startsWith("on")) {
        el.removeAttribute(attr.name);
      }
      if (["src", "href", "xlink:href"].includes(attr.name.toLowerCase()) && attr.value.trim().toLowerCase().startsWith("javascript:")) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return doc.body.innerHTML;
}
