import { useEffect, useRef } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPanel } from "@/components/AdminPanel";
import { getDictionary } from "@/i18n/dictionaries";
import { AppStateProvider, useAppState } from "@/state/AppStateProvider";

vi.mock("@/services/admin-upload-client", () => ({
  uploadImageFile: vi.fn(),
  uploadVideoFile: vi.fn()
}));

vi.mock("@/services/content-client", () => ({
  deleteRemoteContent: vi.fn(),
  fetchRemoteContentDataset: vi.fn(),
  publishRemoteContent: vi.fn(),
  updateRemoteContent: vi.fn()
}));

const { uploadImageFile, uploadVideoFile } = await import("@/services/admin-upload-client");
const { fetchRemoteContentDataset, publishRemoteContent } = await import("@/services/content-client");

function AdminLoginProbe({ remote = false }: { remote?: boolean }) {
  const { loginAs, loginWithPassword } = useAppState();
  const didLogin = useRef(false);

  useEffect(() => {
    if (didLogin.current) {
      return;
    }

    didLogin.current = true;
    if (remote) {
      void loginWithPassword({ email: "admin@example.com", password: "secret-password" });
      return;
    }

    loginAs("admin-1");
  }, [loginAs, loginWithPassword, remote]);

  return null;
}

function mockRemoteAdminLogin() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ displayName: "Admin", email: "admin@example.com", id: "admin-1", memberLevel: "DIAMOND", role: "ADMIN", username: "admin" })
    })) as unknown as typeof fetch
  );
}

function mockSlowRemoteAdminSession() {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                displayName: "站长",
                email: "admin@rinana.local",
                id: "admin-1",
                memberLevel: "DIAMOND",
                role: "SUPER_ADMIN",
                username: "admin"
              })
            });
          }, 50);
        })
    ) as unknown as typeof fetch
  );
}

function mockRemoteAdminLoginWithBrokenName() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ displayName: "?????", email: "admin@example.com", id: "admin-1", memberLevel: "DIAMOND", role: "ADMIN", username: "admin" })
    })) as unknown as typeof fetch
  );
}

describe("AdminPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(fetchRemoteContentDataset).mockRejectedValue(new Error("content unavailable"));
    vi.mocked(publishRemoteContent).mockRejectedValue(new Error("content publish failed"));
  });

  it("renders Chinese admin controls and management lists after an admin logs in", async () => {
    window.localStorage.clear();
    const dictionary = getDictionary("zh");

    render(
      <AppStateProvider>
        <AdminLoginProbe />
        <AdminPanel dictionary={dictionary} locale="zh" />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("内容管理")).toBeInTheDocument();
    });

    expect(screen.getByText("首页品牌")).toBeInTheDocument();
    expect(screen.getByText("改这里就会同步首页左上角的品牌样式。")).toBeInTheDocument();
    expect(screen.getByText("尽量保持短一点，尤其是移动端，避免顶栏换行太挤。")).toBeInTheDocument();
    expect(screen.getByText("当前管理员")).toBeInTheDocument();
    expect(screen.getByText("已发布内容")).toBeInTheDocument();
    expect(screen.getByText("图片存储")).toBeInTheDocument();
    expect(screen.getByText("视频存储")).toBeInTheDocument();
    expect(screen.getByText("图片素材上传")).toBeInTheDocument();
    expect(screen.getByText("视频素材上传")).toBeInTheDocument();
    expect(screen.getByText("搜索成员")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("昵称或邮箱")).toBeInTheDocument();
    expect(screen.getByText(/第 1 \/ 1 页，共 4 人/)).toBeInTheDocument();
    expect(screen.getByText("操作记录")).toBeInTheDocument();
    expect(screen.getByText("暂无操作记录")).toBeInTheDocument();
    expect(screen.getByText("搜索内容")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("标题、正文或日期")).toBeInTheDocument();
    expect(screen.getByText("筛选类型")).toBeInTheDocument();
    expect(screen.getByText("会员等级")).toBeInTheDocument();
    expect(screen.getByText(/显示 8 \/ 8 条/)).toBeInTheDocument();
    expect(screen.getByText("内容状态")).toBeInTheDocument();
    expect(screen.getAllByText("实时预览").length).toBeGreaterThan(0);
    expect(screen.getAllByText("已发布").length).toBeGreaterThan(0);
    expect(screen.getAllByText("标题").length).toBeGreaterThan(0);
    expect(screen.getAllByText("正文").length).toBeGreaterThan(0);
    expect(screen.getByText("置顶动态")).toBeInTheDocument();
    expect(screen.getByText("置顶后会优先出现在首页、动态列表和内容库顶部。")).toBeInTheDocument();
    expect(screen.getAllByText("置顶").length).toBeGreaterThan(0);
    expect(screen.getByText("媒体文件")).toBeInTheDocument();
    expect(screen.getAllByText("停用").length).toBeGreaterThan(0);
    expect(screen.getAllByText("编辑").length).toBeGreaterThan(0);
    expect(screen.getAllByText("删除").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("tab", { name: "视频" }));
    expect(screen.getByText("视频简介")).toBeInTheDocument();
    expect(screen.getByText("封面图片")).toBeInTheDocument();
    expect(screen.getByText("上传视频封面")).toBeInTheDocument();
    expect(screen.queryByText("置顶动态")).not.toBeInTheDocument();
  });

  it("updates the content preview as the admin form changes", async () => {
    window.localStorage.clear();
    const dictionary = getDictionary("zh");

    render(
      <AppStateProvider>
        <AdminLoginProbe />
        <AdminPanel dictionary={dictionary} locale="zh" />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("内容管理")).toBeInTheDocument();
    });

    fireEvent.change(screen.getAllByLabelText("标题")[0], { target: { value: "粉色预览标题" } });
    fireEvent.change(screen.getByText("内容分类").closest("label")!.querySelector("input")!, { target: { value: "日常" } });
    fireEvent.change(screen.getByPlaceholderText("用英文逗号分隔，例如 preview, gold"), { target: { value: "pink, girl" } });
    fireEvent.change(screen.getByLabelText("内容状态"), { target: { value: "scheduled" } });
    fireEvent.change(screen.getByLabelText("定时发布时间"), { target: { value: "2026-06-21T18:30" } });

    expect(screen.getAllByText("实时预览").length).toBeGreaterThan(0);
    expect(screen.getByText("粉色预览标题")).toBeInTheDocument();
    expect(screen.getAllByText("日常").length).toBeGreaterThan(0);
    expect(screen.getByText("#pink #girl")).toBeInTheDocument();
    expect(screen.getAllByText("定时").length).toBeGreaterThan(0);
    expect(screen.getByText("2026/6/21 18:30:00")).toBeInTheDocument();
  });

  it("renders the homepage brand settings block", async () => {
    window.localStorage.clear();
    const dictionary = getDictionary("zh");

    render(
      <AppStateProvider>
        <AdminLoginProbe />
        <AdminPanel dictionary={dictionary} locale="zh" />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("内容管理")).toBeInTheDocument();
    });

    expect(screen.getByText("首页品牌")).toBeInTheDocument();
    expect(screen.getByText("改这里就会同步首页左上角的品牌样式。")).toBeInTheDocument();
    expect(screen.getByText("尽量保持短一点，尤其是移动端，避免顶栏换行太挤。")).toBeInTheDocument();
  });

  it("falls back from broken question-mark profile names in admin surfaces", async () => {
    window.localStorage.clear();
    mockRemoteAdminLoginWithBrokenName();
    const dictionary = getDictionary("zh");

    render(
      <AppStateProvider>
        <AdminLoginProbe remote />
        <AdminPanel dictionary={dictionary} locale="zh" />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("内容管理")).toBeInTheDocument();
    });

    expect(screen.getAllByText("管理员").length).toBeGreaterThan(0);
    expect(screen.queryByText("?????")).not.toBeInTheDocument();
  });

  it("uploads selected images with the admin session without exposing the media access URL", async () => {
    window.localStorage.clear();
    mockRemoteAdminLogin();
    vi.mocked(uploadImageFile).mockResolvedValue({
      mediaAssetId: "media-image",
      path: "gold/cover.webp",
      publicUrl: "/api/media/media-image/view"
    });
    const dictionary = getDictionary("zh");

    render(
      <AppStateProvider>
        <AdminLoginProbe remote />
        <AdminPanel dictionary={dictionary} locale="zh" />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("内容管理")).toBeInTheDocument();
    });

    const file = new File(["image-bytes"], "cover.webp", { type: "image/webp" });
    fireEvent.change(screen.getByLabelText("上传图片文件"), {
      target: { files: [file] }
    });

    await waitFor(() => {
      expect(screen.getByText("图片已上传，可随内容发布。")).toBeInTheDocument();
    });
    expect(screen.queryByDisplayValue("/api/media/media-image/view")).not.toBeInTheDocument();
    expect(screen.queryByText("/api/media/media-image/view")).not.toBeInTheDocument();
    expect(uploadImageFile).toHaveBeenCalledWith({
      accessToken: "cookie-session",
      file,
      onProgress: expect.any(Function),
      visibility: "gold"
    });
  });

  it("waits for remote admin session recovery before showing a locked admin state", async () => {
    window.localStorage.clear();
    mockSlowRemoteAdminSession();
    const dictionary = getDictionary("zh");

    render(
      <AppStateProvider>
        <AdminPanel dictionary={dictionary} locale="zh" />
      </AppStateProvider>
    );

    expect(screen.getByText("正在恢复管理员登录状态")).toBeInTheDocument();
    expect(screen.queryByText("权限不足")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("内容管理")).toBeInTheDocument();
    });
    expect(screen.queryByText("权限不足")).not.toBeInTheDocument();
  });

  it("uploads selected videos without exposing the media access URL", async () => {
    window.localStorage.clear();
    mockRemoteAdminLogin();
    vi.mocked(uploadVideoFile).mockResolvedValue({
      mediaAssetId: "media-video",
      playbackUrl: "/api/media/media-video/view",
      thumbnailUrl: ""
    });
    const dictionary = getDictionary("zh");

    render(
      <AppStateProvider>
        <AdminLoginProbe remote />
        <AdminPanel dictionary={dictionary} locale="zh" />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("内容管理")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: "视频" }));
    const file = new File(["video-bytes"], "trailer.mp4", { type: "video/mp4" });
    fireEvent.change(screen.getByLabelText("上传视频文件"), {
      target: { files: [file] }
    });

    await waitFor(() => {
      expect(screen.getByText("视频已上传，可随内容发布。")).toBeInTheDocument();
    });
    expect(screen.queryByDisplayValue("/api/media/media-video/view")).not.toBeInTheDocument();
    expect(screen.queryByText("/api/media/media-video/view")).not.toBeInTheDocument();
    expect(uploadVideoFile).toHaveBeenCalledWith({
      accessToken: "cookie-session",
      collectionId: expect.stringMatching(/^draft-video-/),
      file,
      onProgress: expect.any(Function),
      visibility: "gold"
    });
  });

  it("shows upload progress and blocks publishing while a file is still uploading", async () => {
    window.localStorage.clear();
    mockRemoteAdminLogin();
    const uploadControl = { finish: () => undefined };
    vi.mocked(uploadImageFile).mockImplementation(
      ({ onProgress }) =>
        new Promise((resolve) => {
          onProgress?.({ percent: 46, phase: "uploading" });
          uploadControl.finish = () => {
            resolve({
              mediaAssetId: "media-image",
              path: "gold/cover.webp",
              publicUrl: "/api/media/media-image/view"
            });
          };
        })
    );
    const dictionary = getDictionary("zh");

    render(
      <AppStateProvider>
        <AdminLoginProbe remote />
        <AdminPanel dictionary={dictionary} locale="zh" />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("内容管理")).toBeInTheDocument();
    });

    const file = new File(["image-bytes"], "cover.webp", { type: "image/webp" });
    fireEvent.change(screen.getByLabelText("上传图片文件"), {
      target: { files: [file] }
    });

    const progressbar = await screen.findByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "46");
    expect(screen.getAllByText("正在上传文件").length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "发布", hidden: false })).toBeDisabled();
    });

    uploadControl.finish();

    await waitFor(() => {
      expect(screen.getByText("图片已上传，可随内容发布。")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "发布" })).not.toBeDisabled();
  });

  it("uploads a separate cover image for video publishing", async () => {
    window.localStorage.clear();
    mockRemoteAdminLogin();
    vi.mocked(uploadImageFile).mockResolvedValue({
      mediaAssetId: "media-cover",
      path: "images/video-cover.webp",
      publicUrl: "/api/media/media-cover/view"
    });
    const dictionary = getDictionary("zh");

    render(
      <AppStateProvider>
        <AdminLoginProbe remote />
        <AdminPanel dictionary={dictionary} locale="zh" />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("内容管理")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: "视频" }));
    fireEvent.change(screen.getByLabelText("内容状态"), { target: { value: "draft" } });
    const file = new File(["cover-bytes"], "video-cover.webp", { type: "image/webp" });
    fireEvent.change(screen.getByLabelText("上传视频封面"), {
      target: { files: [file] }
    });

    await waitFor(() => {
      expect(screen.getByText("视频封面已上传，可随视频发布。")).toBeInTheDocument();
    });
    expect(uploadImageFile).toHaveBeenCalledWith(expect.objectContaining({ visibility: "gold" }));
  });
});
