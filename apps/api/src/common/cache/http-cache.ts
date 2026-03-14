import { createHash } from "node:crypto";

import type { Request, Response } from "express";

const DEFAULT_CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=300";

function createEtag(payload: string): string {
  const digest = createHash("sha1").update(payload).digest("hex");
  return `"${digest}"`;
}

function shouldReturnNotModified(ifNoneMatch: string | undefined, etag: string): boolean {
  if (!ifNoneMatch) {
    return false;
  }

  return ifNoneMatch
    .split(",")
    .map((part) => part.trim())
    .some((candidate) => candidate === etag || candidate === "*");
}

export function sendEtaggedJson(
  request: Request,
  response: Response,
  payload: unknown,
  cacheControl: string = DEFAULT_CACHE_CONTROL
): void {
  const serializedBody = JSON.stringify(payload);
  const etag = createEtag(serializedBody);

  response.setHeader("Cache-Control", cacheControl);
  response.setHeader("ETag", etag);

  if (shouldReturnNotModified(request.header("if-none-match"), etag)) {
    response.status(304).end();
    return;
  }

  response.type("application/json");
  response.status(200).send(serializedBody);
}
