import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AlbumsView } from "@/components/AlbumsView";
import { VideosView } from "@/components/VideosView";
import { getDictionary } from "@/i18n/dictionaries";
import { AppStateProvider } from "@/state/AppStateProvider";

describe("media collection views", () => {
  it("uses Chinese copy and compact count labels on the albums page", () => {
    render(
      <AppStateProvider>
        <AlbumsView dictionary={getDictionary("zh")} locale="zh" />
      </AppStateProvider>
    );

    expect(screen.getByText("相册会按默认等级开放，单张照片也可以单独设置权限。")).toBeInTheDocument();
    expect(screen.getByText("1张照片")).toBeInTheDocument();
    expect(screen.queryByText("1 张照片")).not.toBeInTheDocument();
  });

  it("keeps the Chinese videos page free of admin service labels", () => {
    render(
      <AppStateProvider>
        <VideosView dictionary={getDictionary("zh")} locale="zh" />
      </AppStateProvider>
    );

    expect(screen.getByText("视频按会员等级开放，普通、黄金、钻石用户会看到不同内容。")).toBeInTheDocument();
    expect(screen.getByText("1个视频")).toBeInTheDocument();
    expect(screen.queryByText("视频素材上传")).not.toBeInTheDocument();
    expect(screen.queryByText("1 个视频")).not.toBeInTheDocument();
  });
});
