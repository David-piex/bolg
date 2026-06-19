import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { getDictionary } from "@/i18n/dictionaries";

vi.mock("next/navigation", () => ({
  usePathname: () => "/zh/admin"
}));

describe("LanguageSwitch", () => {
  it("preserves the current route when switching locales", () => {
    render(<LanguageSwitch locale="zh" dictionary={getDictionary("zh")} />);

    expect(screen.getByRole("link", { name: "切换到英文" })).toHaveAttribute("href", "/en/admin");
  });

  it("uses localized version labels instead of a mixed language shortcut", () => {
    render(<LanguageSwitch locale="zh" dictionary={getDictionary("zh")} />);

    expect(screen.getByRole("link", { name: "切换到英文" })).toHaveTextContent("英文版");
    expect(screen.queryByText("ZH / EN")).not.toBeInTheDocument();
  });
});
