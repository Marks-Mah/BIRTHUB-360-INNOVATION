import type { NextFunction, Request, Response } from "express";

const blockedUserAgentPatterns = [
  /sqlmap/i,
  /nikto/i,
  /acunetix/i,
  /nmap/i,
  /masscan/i,
];

const suspiciousPayloadPatterns = [
  /<script\b[^>]*>/i,
  /union\s+select/i,
  /information_schema/i,
  /\.{2}\//,
  /\b(or|and)\b\s+1=1/i,
];

function includesSuspiciousPattern(value: unknown): boolean {
  if (typeof value === "string") {
    return suspiciousPayloadPatterns.some((pattern) => pattern.test(value));
  }

  if (Array.isArray(value)) {
    return value.some((item) => includesSuspiciousPattern(item));
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) => includesSuspiciousPattern(item));
  }

  return false;
}

function ipv4ToNumber(ip: string): number | null {
  const normalized = ip.replace("::ffff:", "");
  const parts = normalized.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => Number(part));
  if (octets.some((value) => Number.isNaN(value) || value < 0 || value > 255)) return null;
  return (((octets[0] << 24) >>> 0) + (octets[1] << 16) + (octets[2] << 8) + octets[3]) >>> 0;
}

function isInCidrRange(ip: string, cidr: string): boolean {
  const [baseIp, prefixRaw] = cidr.split("/");
  const prefix = Number(prefixRaw);
  const ipNumber = ipv4ToNumber(ip);
  const baseNumber = ipv4ToNumber(baseIp);

  if (ipNumber === null || baseNumber === null || Number.isNaN(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }

  if (prefix === 0) return true;
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  return (ipNumber & mask) === (baseNumber & mask);
}

function isIpBlocked(ip: string, blockedIpRules: string[]): boolean {
  return blockedIpRules.some((rule) => {
    if (rule.includes("/")) {
      return isInCidrRange(ip, rule);
    }

    return ip.replace("::ffff:", "") === rule;
  });
}

export function createAdvancedWafMiddleware(options?: { blockedIpRules?: string[] }) {
  const blockedIpRules = (options?.blockedIpRules ?? []).map((rule) => rule.trim()).filter(Boolean);

  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = (req.ip || req.socket.remoteAddress || "").trim();
    const userAgent = req.header("user-agent") ?? "";

    if (clientIp && isIpBlocked(clientIp, blockedIpRules)) {
      return res.status(403).json({
        error: {
          code: "WAF_IP_BLOCKED",
          message: "Request blocked by WAF IP policy",
        },
      });
    }

    if (blockedUserAgentPatterns.some((pattern) => pattern.test(userAgent))) {
      return res.status(403).json({
        error: {
          code: "WAF_BLOCKED_USER_AGENT",
          message: "Request blocked by WAF user-agent policy",
        },
      });
    }

    if (
      includesSuspiciousPattern(req.originalUrl) ||
      includesSuspiciousPattern(req.query) ||
      includesSuspiciousPattern(req.body)
    ) {
      return res.status(406).json({
        error: {
          code: "WAF_SUSPICIOUS_PAYLOAD",
          message: "Suspicious payload blocked by WAF",
        },
      });
    }

    return next();
  };
}

export const advancedWafMiddleware = createAdvancedWafMiddleware({
  blockedIpRules: (process.env.WAF_BLOCKED_IPS ?? "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean),
});
