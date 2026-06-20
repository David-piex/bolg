import { ContentDetailView } from "@/components/ContentDetailView";
import { getDictionary } from "@/i18n/dictionaries";
import { normalizeLocale } from "@/i18n/routing";

export default async function VideoDetailPage({
  params
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam);

  return <ContentDetailView dictionary={getDictionary(locale)} id={id} kind="video" locale={locale} />;
}
