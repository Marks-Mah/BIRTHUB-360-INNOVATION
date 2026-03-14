import type { NextFunction, Request, Response } from "express";

import { ProblemDetailsError } from "../lib/problem-details.js";

import { parseCookies } from "./authentication.js";

const mutationMethods = new Set(["PATCH", "POST", "PUT", "DELETE"]);

export function csrfProtection(config: {
  cookieName: string;
  headerName: string;
  ignoredPaths?: string[];
}) {
  const ignored = new Set(config.ignoredPaths ?? []);

  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!mutationMethods.has(request.method)) {
      next();
      return;
    }

    if (ignored.has(request.path)) {
      next();
      return;
    }

    if (request.context.authType !== "session") {
      next();
      return;
    }

    const cookies = parseCookies(request.header("cookie"));
    const cookieToken = cookies[config.cookieName];
    const headerToken = request.header(config.headerName);

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      next(
        new ProblemDetailsError({
          detail: "CSRF token mismatch. Submit the same token via cookie and header.",
          status: 403,
          title: "Forbidden"
        })
      );
      return;
    }

    next();
  };
}
