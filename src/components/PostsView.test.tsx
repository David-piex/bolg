import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PostsView } from "@/components/PostsView";
import { getDictionary } from "@/i18n/dictionaries";
import { AppStateProvider } from "@/state/AppStateProvider";

describe("PostsView", () => {
  it("uses localized membership level names in the Chinese route copy", () => {
    render(
      <AppStateProvider>
        <PostsView dictionary={getDictionary("zh")} locale="zh" />
      </AppStateProvider>
    );

    expect(screen.getByText("可见等级：公开 / 普通 / 黄金 / 钻石")).toBeInTheDocument();
    expect(screen.queryByText("Visibility: public / normal / gold / diamond")).not.toBeInTheDocument();
  });
});
