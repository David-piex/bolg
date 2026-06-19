import { describe, expect, it } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";

describe("dictionaries", () => {
  const requiredSections = ["nav", "home", "auth", "admin", "membership", "content", "common"] as const;

  it("contains Chinese and English dictionaries", () => {
    expect(Object.keys(dictionaries).sort()).toEqual(["en", "zh"]);
  });

  it("contains required UI sections for both languages", () => {
    for (const locale of ["zh", "en"] as const) {
      for (const section of requiredSections) {
        expect(dictionaries[locale][section]).toBeDefined();
      }
    }
  });

  it("contains labels for every content visibility level", () => {
    for (const locale of ["zh", "en"] as const) {
      expect(dictionaries[locale].membership.public).toBeTruthy();
      expect(dictionaries[locale].membership.normal).toBeTruthy();
      expect(dictionaries[locale].membership.gold).toBeTruthy();
      expect(dictionaries[locale].membership.diamond).toBeTruthy();
    }
  });

  it("keeps the Chinese dictionary free of old English homepage labels", () => {
    const chineseDictionaryText = JSON.stringify(dictionaries.zh);

    for (const label of [
      "MEDIA ARCHIVE",
      "Media archive",
      "Access ladder",
      "Viewer status",
      "Invite only",
      "Recently cleared",
      "Archive entry",
      "ZH / EN",
      "Image URL",
      "Video URL"
    ]) {
      expect(chineseDictionaryText).not.toContain(label);
    }
  });
});
