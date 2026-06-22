import "@testing-library/jest-dom/vitest";

(globalThis as { __testCookie?: string }).__testCookie = "XSRF-TOKEN=test-xsrf-token";

Object.defineProperty(document, "cookie", {
  configurable: true,
  get() {
    return (globalThis as { __testCookie?: string }).__testCookie ?? "";
  },
  set(value: string) {
    (globalThis as { __testCookie?: string }).__testCookie = value;
  }
});
