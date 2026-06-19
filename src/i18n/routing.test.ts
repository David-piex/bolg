import { describe, expect, it } from "vitest";
import { defaultLocale, isLocale, normalizeLocale, switchLocalePath } from "@/i18n/routing";

describe("locale routing", () => {
  it("defaults to Chinese", () => {
    expect(defaultLocale).toBe("zh");
    expect(normalizeLocale(undefined)).toBe("zh");
    expect(normalizeLocale("fr")).toBe("zh");
  });

  it("supports Chinese and English", () => {
    expect(isLocale("zh")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("jp")).toBe(false);
  });

  it("switches a localized path while preserving the route", () => {
    expect(switchLocalePath("/zh/videos", "en")).toBe("/en/videos");
    expect(switchLocalePath("/en/admin", "zh")).toBe("/zh/admin");
    expect(switchLocalePath("/videos", "en")).toBe("/en/videos");
  });
});
