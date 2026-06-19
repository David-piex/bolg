import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { getDictionary } from "@/i18n/dictionaries";
import { normalizeLocale, type Locale } from "@/i18n/routing";
import { AppStateProvider } from "@/state/AppStateProvider";

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam);
  const dictionary = getDictionary(locale);

  return (
    <AppStateProvider>
      <AppShell locale={locale} dictionary={dictionary}>
        {children}
      </AppShell>
    </AppStateProvider>
  );
}

export function generateStaticParams(): Array<{ locale: Locale }> {
  return [{ locale: "zh" }, { locale: "en" }];
}
