import type { NextFunction, Request, Response } from "express";

import { authenticateRequest } from "../modules/auth/auth.service.js";

/** @see ADR-010 */
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const [rawName, ...valueParts] = part.trim().split("=");

    if (!rawName || valueParts.length === 0) {
      return acc;
    }

    acc[rawName] = decodeURIComponent(valueParts.join("="));
    return acc;
  }, {});
}

function extractAuthorizationToken(headerValue: string | undefined): {
  apiKeyToken?: string;
  sessionToken?: string;
} {
  if (!headerValue) {
    return {};
  }

  const [scheme, credential] = headerValue.split(" ");

  if (!scheme || !credential) {
    return {};
  }

  const normalizedScheme = scheme.toLowerCase();

  if (normalizedScheme === "apikey") {
    return { apiKeyToken: credential };
  }

  if (normalizedScheme !== "bearer") {
    return {};
  }

  if (credential.startsWith("bh360_live_")) {
    return { apiKeyToken: credential };
  }

  return { sessionToken: credential };
}

export function authenticationMiddleware(sessionCookieName: string) {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const cookies = parseCookies(request.header("cookie"));
      const authorization = extractAuthorizationToken(request.header("authorization"));
      const sessionToken = authorization.sessionToken ?? cookies[sessionCookieName] ?? null;
      const apiKeyToken = authorization.apiKeyToken ?? null;
      const authenticated = await authenticateRequest({
        apiKeyToken,
        sessionToken
      });

      if (!authenticated) {
        next();
        return;
      }

      request.context.authType = authenticated.authType;
      request.context.apiKeyId = authenticated.apiKeyId;
      request.context.sessionId = authenticated.sessionId;
      request.context.tenantId = authenticated.organizationId;
      request.context.userId = authenticated.userId;

      response.setHeader("x-tenant-id", authenticated.organizationId);
      response.setHeader("x-user-id", authenticated.userId);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export { parseCookies };
