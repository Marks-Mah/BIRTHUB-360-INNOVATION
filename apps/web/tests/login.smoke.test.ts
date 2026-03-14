import assert from "node:assert/strict";
import test from "node:test";

import { JSDOM } from "jsdom";
import React from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

void test("login page hydrates without mismatch", async () => {
  const { LoginForm } = await import("../components/login-form.js");
  const markup = renderToString(
    React.createElement(LoginForm, {
      apiUrl: "http://localhost:3000",
      initialRequestId: "req_test",
      navigate: () => undefined
    })
  );

  const dom = new JSDOM(`<div id="root">${markup}</div>`, {
    url: "http://localhost:3001/login"
  });
  const container = dom.window.document.getElementById("root");

  if (!container) {
    throw new Error("Root container not found.");
  }

  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalNavigator = globalThis.navigator;
  const originalConsoleError = console.error;
  const hydrationErrors: string[] = [];

  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });

  console.error = (...args: unknown[]) => {
    hydrationErrors.push(args.join(" "));
  };

  const root = hydrateRoot(
    container,
    React.createElement(LoginForm, {
      apiUrl: "http://localhost:3000",
      initialRequestId: "req_test",
      navigate: () => undefined
    })
  );

  await new Promise((resolve) => {
    dom.window.setTimeout(resolve, 50);
  });

  root.unmount();
  await new Promise((resolve) => {
    dom.window.setTimeout(resolve, 50);
  });
  dom.window.close();

  console.error = originalConsoleError;

  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: originalNavigator });

  assert.deepEqual(hydrationErrors, []);
});
