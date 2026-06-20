import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeView } from "@/components/HomeView";
import { getDictionary } from "@/i18n/dictionaries";
import { AppStateProvider } from "@/state/AppStateProvider";

describe("HomeView", () => {
  it("renders localized Chinese media archive labels", () => {
    const dictionary = getDictionary("zh");

    render(
      <AppStateProvider>
        <HomeView dictionary={dictionary} locale="zh" />
      </AppStateProvider>
    );

    expect(screen.getByText("媒体档案")).toBeInTheDocument();
    expect(screen.getByText("权限阶梯")).toBeInTheDocument();
    expect(screen.getByLabelText("精选内容预览")).toBeInTheDocument();
    expect(screen.getByText("当前身份")).toBeInTheDocument();
    expect(screen.getByText("邀请码注册")).toBeInTheDocument();
    expect(screen.getByText("语言版本")).toBeInTheDocument();
    expect(screen.getByText("最近开放")).toBeInTheDocument();
    expect(screen.getAllByText("内容条目").length).toBeGreaterThan(0);
    const heading = screen.getByRole("heading", { level: 1, name: dictionary.home.title });
    expect(heading).toHaveClass("archive-title");
    expect(heading).toHaveTextContent("绫奈");
    expect(heading.querySelectorAll(".archive-title-line")).toHaveLength(3);
    expect(Array.from(heading.querySelectorAll(".archive-title-line")).map((line) => line.textContent)).toEqual([
      "绫奈动态",
      "相册和视频",
      "按会员等级开放"
    ]);
    expect(screen.getByText(dictionary.home.latest)).toBeInTheDocument();
    expect(screen.getAllByText(dictionary.content.openDetail).length).toBeGreaterThan(0);

    expect(screen.queryByText("MEDIA ARCHIVE")).not.toBeInTheDocument();
    expect(screen.queryByText("Access ladder")).not.toBeInTheDocument();
    expect(screen.queryByText("Viewer status")).not.toBeInTheDocument();
    expect(screen.queryByText("Invite only")).not.toBeInTheDocument();
    expect(screen.queryByText("Recently cleared")).not.toBeInTheDocument();
    expect(screen.queryByText("Archive entry")).not.toBeInTheDocument();
  });
});
