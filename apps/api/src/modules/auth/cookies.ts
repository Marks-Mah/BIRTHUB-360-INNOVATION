import type { Response } from "express";

import type { ApiConfig } from "@birthub/config";

import type { SessionTokens } from "./auth.service.js";

function secureCookie(config: ApiConfig): boolean {
  return config.REQUIRE_SECURE_COOKIES || config.NODE_ENV === "production";
}

export function setAuthCookies(response: Response, config: ApiConfig, tokens: SessionTokens): void {
  const commonOptions = {
    sameSite: "strict" as const,
    secure: secureCookie(config)
  };

  response.cookie(config.API_AUTH_COOKIE_NAME, tokens.token, {
    ...commonOptions,
    expires: tokens.expiresAt,
    httpOnly: true
  });

  response.cookie(config.API_AUTH_REFRESH_COOKIE_NAME, tokens.refreshToken, {
    ...commonOptions,
    expires: new Date(Date.now() + config.API_AUTH_SESSION_TTL_HOURS * 60 * 60 * 1000),
    httpOnly: true
  });

  response.cookie(config.API_CSRF_COOKIE_NAME, tokens.csrfToken, {
    ...commonOptions,
    expires: tokens.expiresAt,
    httpOnly: false
  });
}

export function clearAuthCookies(response: Response, config: ApiConfig): void {
  const cookieOptions = {
    sameSite: "strict" as const,
    secure: secureCookie(config)
  };

  response.clearCookie(config.API_AUTH_COOKIE_NAME, cookieOptions);
  response.clearCookie(config.API_AUTH_REFRESH_COOKIE_NAME, cookieOptions);
  response.clearCookie(config.API_CSRF_COOKIE_NAME, cookieOptions);
}
