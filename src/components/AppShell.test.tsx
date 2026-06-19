import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/AppShell";
import { getDictionary } from "@/i18n/dictionaries";

vi.mock("next/navigation", () => ({
  usePathname: () => "/zh"
}));

describe("AppShell", () => {
  it("uses the site name in the header", () => {
    const { container } = render(
      <AppShell locale="zh" dictionary={getDictionary("zh")}>
        <div />
      </AppShell>
    );

    expect(container.firstElementChild).toHaveClass("site-shell-zh");
    expect(screen.getByText("绫奈")).toBeInTheDocument();
  });

  it("uses Chinese labels for the shell on the Chinese route", () => {
    render(
      <AppShell locale="zh" dictionary={getDictionary("zh")}>
        <div />
      </AppShell>
    );

    expect(screen.getByRole("navigation", { name: "主导航" })).toBeInTheDocument();
    expect(screen.getByText("英文版")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "切换到英文" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Primary" })).not.toBeInTheDocument();
    expect(screen.queryByText("English")).not.toBeInTheDocument();
    expect(screen.queryByText("ZH / EN")).not.toBeInTheDocument();
  });
});
