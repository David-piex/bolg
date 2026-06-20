import { PostsView } from "@/components/PostsView";
import { getDictionary } from "@/i18n/dictionaries";
import { normalizeLocale } from "@/i18n/routing";

export default async function PostsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam);
  const dictionary = getDictionary(locale);

  return <PostsView dictionary={dictionary} locale={locale} />;
}
