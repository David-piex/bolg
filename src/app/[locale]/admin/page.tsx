import { AdminPanel } from "@/components/AdminPanel";
import { getDictionary } from "@/i18n/dictionaries";
import { normalizeLocale } from "@/i18n/routing";

export default async function AdminPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const dictionary = getDictionary(normalizeLocale(localeParam));

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">{dictionary.admin.title}</span>
        <h1>{dictionary.admin.title}</h1>
        <p>{dictionary.admin.subtitle}</p>
      </section>
      <AdminPanel dictionary={dictionary} />
    </div>
  );
}
