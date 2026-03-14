import { createHmac, timingSafeEqual } from "crypto";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

export type WebhookProvider = "stripe" | "meta-ads" | "docusign" | "clicksign" | "focus-nfe";

interface SignatureOptions {
  provider: WebhookProvider;
  secretEnvVar: string;
  signatureHeader: string;
  mode?: "hmac" | "jwt";
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

function extractSignature(signatureHeader: string): string {
  const match = signatureHeader.match(/v1=([a-fA-F0-9]+)/);
  return match?.[1] ?? signatureHeader.trim();
}

export function webhookSignatureMiddleware({
  provider,
  secretEnvVar,
  signatureHeader,
  mode = "hmac",
}: SignatureOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const secret = process.env[secretEnvVar];
    if (!secret) {
      return res.status(503).json({ code: "WEBHOOK_SECRET_NOT_CONFIGURED", message: `Secret not configured for ${provider}` });
    }

    const providedHeader = req.header(signatureHeader);
    if (!providedHeader) {
      return res.status(401).json({ code: "WEBHOOK_SIGNATURE_MISSING", message: "Missing webhook signature" });
    }

    if (mode === "jwt") {
      try {
        jwt.verify(providedHeader, secret);
        return next();
      } catch {
        return res.status(401).json({ code: "WEBHOOK_SIGNATURE_INVALID", message: "Invalid webhook jwt" });
      }
    }

    const payload = JSON.stringify(req.body ?? {});
    const computed = createHmac("sha256", secret).update(payload).digest("hex");
    const provided = extractSignature(providedHeader);
    if (!safeEqual(provided, computed)) {
      return res.status(401).json({ code: "WEBHOOK_SIGNATURE_INVALID", message: "Invalid webhook signature" });
    }

    return next();
  };
}
