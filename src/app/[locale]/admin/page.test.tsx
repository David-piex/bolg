import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminPage from "@/app/[locale]/admin/page";
import AdminAuditPage from "@/app/[locale]/admin/audit/page";

vi.mock("@/components/AdminPanelLazy", () => ({
  AdminPanelLazy: () => <div>admin-panel</div>
}));

vi.mock("lucide-react", () => ({
  Cloud: () => <svg />,
  History: () => <svg />,
  LayoutGrid: () => <svg />,
  UsersRound: () => <svg />,
  Video: () => <svg />
}));

vi.mock("@/services/java-api-client", () => ({
  listAdminAuditLogs: vi.fn(async () => ({
    items: [
      {
        actionType: "UPDATE_USER",
        adminDisplayName: "Admin",
        adminUserId: "admin-1",
        adminUsername: "admin",
        createdAt: "2026-06-21T10:00:00Z",
        detailJson: '{"level":"gold"}',
        id: "audit-1",
        targetId: "user-1",
        targetType: "USER"
      }
    ],
    page: 0,
    size: 20,
    total: 1,
    totalPages: 1
  }))
}));

vi.mock("@/i18n/routing", () => ({
  normalizeLocale: (value: string) => value
}));

vi.mock("next/link", () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  )
}));

describe("admin pages", () => {
  it("shows an audit entry link on the admin landing page", async () => {
    const page = await AdminPage({ params: Promise.resolve({ locale: "zh" }) });
    render(page);

    expect(screen.getByRole("heading", { name: "管理员后台" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /操作记录/ })).toHaveAttribute("href", "/zh/admin/audit");
  });

  it("renders the audit log page", async () => {
    const page = await AdminAuditPage({ params: Promise.resolve({ locale: "zh" }) });
    render(page);

    expect(screen.getAllByText("操作记录").length).toBeGreaterThan(0);
    const row = screen.getByText("UPDATE_USER").closest(".audit-row");
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText(/level:\s*gold/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "上一页" })).toHaveAttribute("href", "/zh/admin/audit?page=1");
  });
});
