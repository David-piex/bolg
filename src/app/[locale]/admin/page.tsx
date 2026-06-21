import { Cloud, History, LayoutGrid, UsersRound, Video } from "lucide-react";
import Link from "next/link";
import { AdminPanelLazy } from "@/components/AdminPanelLazy";
import { getDictionary } from "@/i18n/dictionaries";
import { normalizeLocale } from "@/i18n/routing";

export default async function AdminPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam);
  const dictionary = getDictionary(locale);

  return (
    <div className="page">
      <section className="hero admin-hero">
        <div className="hero-copy">
          <span className="eyebrow">{dictionary.admin.title}</span>
          <h1>{dictionary.admin.title}</h1>
          <p>{dictionary.admin.subtitle}</p>
        </div>
        <div className="admin-hero-links split-summary">
          <Link className="summary-chip admin-entry-card" href={`/${locale}/admin/audit`}>
            <History size={18} />
            <strong>{dictionary.admin.auditLogs}</strong>
            <span className="muted">{dictionary.admin.auditLogsHint}</span>
          </Link>
          <div className="summary-chip admin-entry-card">
            <LayoutGrid size={18} />
            <strong>{dictionary.admin.existingContent}</strong>
            <span className="muted">{dictionary.admin.contentLibraryHint}</span>
          </div>
          <div className="summary-chip admin-entry-card">
            <UsersRound size={18} />
            <strong>{dictionary.admin.users}</strong>
            <span className="muted">{dictionary.admin.changeLevel}</span>
          </div>
          <div className="summary-chip admin-entry-card">
            <Cloud size={18} />
            <strong>{dictionary.admin.mediaLibrary}</strong>
            <span className="muted">{dictionary.admin.mediaLibraryHint}</span>
          </div>
          <div className="summary-chip admin-entry-card">
            <Video size={18} />
            <strong>{dictionary.admin.videoStorage}</strong>
            <span className="muted">{dictionary.admin.videoUploadHint}</span>
          </div>
        </div>
      </section>
      <AdminPanelLazy dictionary={dictionary} />
    </div>
  );
}
