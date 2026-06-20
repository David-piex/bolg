import { AccountSettingsView } from "@/components/AccountSettingsView";
import { getDictionary } from "@/i18n/dictionaries";
import { normalizeLocale } from "@/i18n/routing";

export default async function AccountPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const dictionary = getDictionary(normalizeLocale(localeParam));

  return (
    <div className="page">
      <section className="hero auth-hero">
        <span className="eyebrow">{dictionary.nav.account}</span>
        <h1>{dictionary.account.title}</h1>
        <p>{dictionary.account.subtitle}</p>
      </section>
      <AccountSettingsView dictionary={dictionary} />
    </div>
  );
}
