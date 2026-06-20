import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContentCard } from "@/components/ContentCard";
import { getDictionary } from "@/i18n/dictionaries";

describe("ContentCard", () => {
  it("shows a real empty cover state instead of a fake photo block when there is no cover image", () => {
    const dictionary = getDictionary("zh");

    render(
      <ContentCard
        title="未命名相册"
        excerpt="相册描述"
        coverImage=""
        requiredLevel="gold"
        dictionary={dictionary}
        meta="1张照片"
      />
    );

    expect(screen.getByText("暂无封面")).toBeInTheDocument();
    expect(screen.getByLabelText("未命名相册封面")).toHaveClass("card-media-empty");
    expect(screen.queryByRole("img", { name: "未命名相册封面" })).not.toBeInTheDocument();
    expect(screen.queryByText("Untitled album")).not.toBeInTheDocument();
    expect(screen.queryByText("New album")).not.toBeInTheDocument();
  });
});
