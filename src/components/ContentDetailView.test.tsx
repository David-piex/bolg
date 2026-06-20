import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContentDetailView } from "@/components/ContentDetailView";
import { getDictionary } from "@/i18n/dictionaries";
import { AppStateProvider } from "@/state/AppStateProvider";

describe("ContentDetailView", () => {
  it("renders a post detail page for visible content", () => {
    render(
      <AppStateProvider>
        <ContentDetailView dictionary={getDictionary("zh")} id="post-public" kind="post" locale="zh" />
      </AppStateProvider>
    );

    expect(screen.getByRole("link", { name: "返回列表" })).toHaveAttribute("href", "/zh/posts");
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText("没有找到这条内容")).not.toBeInTheDocument();
  });

  it("shows a clear locked or missing state for unavailable content", () => {
    render(
      <AppStateProvider>
        <ContentDetailView dictionary={getDictionary("zh")} id="missing-content" kind="video" locale="zh" />
      </AppStateProvider>
    );

    expect(screen.getByText("没有找到这条内容")).toBeInTheDocument();
    expect(screen.getByText("内容可能已删除、未发布，或当前账号等级还不能访问。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回列表" })).toHaveAttribute("href", "/zh/videos");
  });
});
