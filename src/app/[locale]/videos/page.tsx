import { VideosView } from "@/components/VideosView";
import { getDictionary } from "@/i18n/dictionaries";
import { normalizeLocale } from "@/i18n/routing";

export default async function VideosPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam);
  const dictionary = getDictionary(locale);

  return <VideosView dictionary={dictionary} locale={locale} />;
}
