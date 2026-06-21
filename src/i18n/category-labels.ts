import type { Locale } from "@/i18n/routing";

const categoryLabels: Record<Locale, Record<string, string>> = {
  zh: {
    daily: "日常",
    exclusive: "专属",
    member: "会员专属",
    portrait: "写真",
    studio: "片场",
    trailer: "预告"
  },
  en: {
    daily: "Daily",
    exclusive: "Exclusive",
    member: "Members only",
    portrait: "Portrait",
    studio: "Studio",
    trailer: "Trailer"
  }
};

export function formatCategoryLabel(value: string, locale: Locale = "zh"): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const label = categoryLabels[locale][trimmed.toLowerCase()];
  if (label) {
    return label;
  }

  if (/^[a-z0-9_-]+$/i.test(trimmed)) {
    return trimmed
      .split(/[_-]+/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
      .join(" ");
  }

  return trimmed;
}
