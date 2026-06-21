import { History } from "lucide-react";
import Link from "next/link";
import { getDictionary } from "@/i18n/dictionaries";
import { normalizeLocale } from "@/i18n/routing";
import { listAdminAuditLogs } from "@/services/java-api-client";

function formatAuditDetail(detailJson: string) {
  try {
    const parsed = JSON.parse(detailJson) as Record<string, unknown>;
    return Object.entries(parsed)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(" / ");
  } catch {
    return detailJson;
  }
}

function formatAuditDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default async function AdminAuditPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ page?: string }>;
}) {
  const { locale: localeParam } = await params;
  const { page: pageParam } = (await searchParams) ?? {};
  const locale = normalizeLocale(localeParam);
  const dictionary = getDictionary(locale);
  const page = Math.max((Number.parseInt(pageParam ?? "1", 10) || 1) - 1, 0);
  const auditPage = await listAdminAuditLogs({ page, size: 20 }).catch(() => ({
    items: [],
    page,
    size: 20,
    total: 0,
    totalPages: 1
  }));
  const currentPage = auditPage.page + 1;
  const totalPages = Math.max(1, auditPage.totalPages);

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">{dictionary.admin.auditLogs}</span>
        <h1>{dictionary.admin.auditLogs}</h1>
        <p>{dictionary.admin.auditLogsHint}</p>
      </section>

      <section className="admin-section admin-section-wide audit-section">
        <div className="section-heading">
          <History size={20} />
          <div>
            <h2>{dictionary.admin.auditLogs}</h2>
            <p>{dictionary.admin.auditLogsHint}</p>
          </div>
        </div>
        <div className="audit-list">
          {auditPage.items.map((log) => (
            <div className="audit-row" key={log.id}>
              <div className="audit-action">
                <span>{log.actionType}</span>
                <strong>{formatAuditDate(log.createdAt)}</strong>
              </div>
              <div className="audit-main">
                <div className="audit-meta-grid">
                  <span>
                    {dictionary.admin.auditActor}
                    {dictionary.common.colon}
                    <b>{log.adminDisplayName || log.adminUsername}</b>
                  </span>
                  <span>
                    {dictionary.admin.auditTarget}
                    {dictionary.common.colon}
                    <b>{log.targetType}</b>
                  </span>
                </div>
                <p>
                  {dictionary.admin.auditDetail}
                  {dictionary.common.colon}
                  {formatAuditDetail(log.detailJson)}
                </p>
              </div>
              <code title={log.targetId ?? log.id}>{log.targetId ?? log.id}</code>
            </div>
          ))}
          {auditPage.items.length === 0 ? <p className="muted">{dictionary.admin.noAuditLogs}</p> : null}
        </div>
        <div className="member-pagination" aria-live="polite">
          <span>{dictionary.admin.auditPageSummary.replace("{page}", String(currentPage)).replace("{totalPages}", String(totalPages)).replace("{total}", String(auditPage.total))}</span>
          <div>
            <Link className="pagination-link" aria-disabled={currentPage <= 1} href={`/${locale}/admin/audit?page=${Math.max(currentPage - 1, 1)}`}>
              {dictionary.admin.memberPrevious}
            </Link>
            <Link className="pagination-link" aria-disabled={currentPage >= totalPages} href={`/${locale}/admin/audit?page=${Math.min(currentPage + 1, totalPages)}`}>
              {dictionary.admin.memberNext}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
