import { ContentDetailView } from "@/components/ContentDetailView";
import { getDictionary } from "@/i18n/dictionaries";
import { normalizeLocale } from "@/i18n/routing";
import { fetchServerPostDetail } from "@/services/content-detail-server";

export default async function PostDetailPage({
  params
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam);
  const initialDetail = await fetchServerPostDetail(id);

  return (
    <ContentDetailView
      dictionary={getDictionary(locale)}
      id={id}
      initialDetail={initialDetail}
      kind="post"
      locale={locale}
    />
  );
}
