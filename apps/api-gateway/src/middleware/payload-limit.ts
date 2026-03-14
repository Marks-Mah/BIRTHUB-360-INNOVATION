import type { NextFunction, Request, Response } from "express";

interface PayloadLimitOptions {
  maxBytes: number;
  code?: string;
}

function getBodySize(req: Request): number {
  if (!req.body || typeof req.body !== "object") {
    return 0;
  }

  return Buffer.byteLength(JSON.stringify(req.body), "utf8");
}

export function payloadLimitMiddleware({
  maxBytes,
  code = "PAYLOAD_TOO_LARGE",
}: PayloadLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const headerValue = req.header("content-length");
    const declaredSize = headerValue ? Number(headerValue) : null;

    if (declaredSize && declaredSize > maxBytes) {
      return res.status(413).json({
        code,
        message: `Payload exceeds limit of ${maxBytes} bytes`,
        details: { maxBytes },
      });
    }

    const actualSize = getBodySize(req);
    if (actualSize > maxBytes) {
      return res.status(413).json({
        code,
        message: `Payload exceeds limit of ${maxBytes} bytes`,
        details: { maxBytes },
      });
    }

    return next();
  };
}
