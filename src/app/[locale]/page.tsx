import { HomeView } from "@/components/HomeView";
import { getDictionary } from "@/i18n/dictionaries";
import { normalizeLocale } from "@/i18n/routing";

export default async function HomePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam);
  const dictionary = getDictionary(locale);

  return <HomeView dictionary={dictionary} locale={locale} />;
}
