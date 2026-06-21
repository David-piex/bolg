import { ContentDetailView } from "@/components/ContentDetailView";
import { getDictionary } from "@/i18n/dictionaries";
import { normalizeLocale } from "@/i18n/routing";
import { buildContentDetailMetadata } from "@/services/content-detail-metadata";
import { fetchServerAlbumDetail } from "@/services/content-detail-server";

export default async function AlbumDetailPage({
  params
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam);
  const initialDetail = await fetchServerAlbumDetail(id);

  return (
    <ContentDetailView
      dictionary={getDictionary(locale)}
      id={id}
      initialDetail={initialDetail}
      kind="album"
      locale={locale}
    />
  );
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam);
  const detail = await fetchServerAlbumDetail(id);
  return buildContentDetailMetadata({ detail, id, kind: "album", locale });
}
