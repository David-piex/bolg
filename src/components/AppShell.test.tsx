import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/AppShell";
import { getDictionary } from "@/i18n/dictionaries";
import { AppStateProvider, useAppState } from "@/state/AppStateProvider";

vi.mock("next/navigation", () => ({
  usePathname: () => "/zh"
}));

describe("AppShell", () => {
  it("uses the site name in the header", () => {
    const { container } = render(
      <AppStateProvider>
        <AppShell locale="zh" dictionary={getDictionary("zh")}>
          <div />
        </AppShell>
      </AppStateProvider>
    );

    expect(container.firstElementChild).toHaveClass("site-shell-zh");
    expect(screen.getByText("绫奈")).toBeInTheDocument();
  });

  it("uses Chinese labels for the shell on the Chinese route", () => {
    render(
      <AppStateProvider>
        <AppShell locale="zh" dictionary={getDictionary("zh")}>
          <div />
        </AppShell>
      </AppStateProvider>
    );

    expect(screen.getByRole("navigation", { name: "主导航" })).toBeInTheDocument();
    expect(screen.getByText("英文版")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "切换到英文" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Primary" })).not.toBeInTheDocument();
    expect(screen.queryByText("English")).not.toBeInTheDocument();
    expect(screen.queryByText("ZH / EN")).not.toBeInTheDocument();
  });

  it("hides the admin link from visitors", () => {
    render(
      <AppStateProvider>
        <AppShell locale="zh" dictionary={getDictionary("zh")}>
          <div />
        </AppShell>
      </AppStateProvider>
    );

    expect(screen.getByRole("link", { name: /登录/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /后台/ })).not.toBeInTheDocument();
  });

  it("shows the admin link after an admin signs in", () => {
    function AdminLoginProbe() {
      const { loginAs } = useAppState();

      return (
        <button type="button" onClick={() => loginAs("admin-1")}>
          admin login
        </button>
      );
    }

    render(
      <AppStateProvider>
        <AppShell locale="zh" dictionary={getDictionary("zh")}>
          <AdminLoginProbe />
        </AppShell>
      </AppStateProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "admin login" }));

    expect(screen.getByRole("link", { name: /后台/ })).toBeInTheDocument();
  });
});
