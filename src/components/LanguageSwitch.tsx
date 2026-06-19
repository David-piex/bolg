"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { getDictionary } from "@/i18n/dictionaries";
import { switchLocalePath, type Locale } from "@/i18n/routing";

type Dictionary = ReturnType<typeof getDictionary>;

export function LanguageSwitch({
  locale,
  dictionary
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const pathname = usePathname();
  const otherLocale = locale === "zh" ? "en" : "zh";
  const label = locale === "zh" ? dictionary.common.english : dictionary.common.chinese;
  const ariaLabel = locale === "zh" ? dictionary.common.switchToEnglish : dictionary.common.switchToChinese;

  return (
    <Link
      className="language-switch"
      href={switchLocalePath(pathname, otherLocale)}
      aria-label={ariaLabel}
    >
      {label}
    </Link>
  );
}
