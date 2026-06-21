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
        <AdminPanel dictionary={dictionary} />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("内容管理")).toBeInTheDocument();
    });

    expect(screen.getByText("当前管理员")).toBeInTheDocument();
    expect(screen.getByText("已发布内容")).toBeInTheDocument();
    expect(screen.getByText("图片存储")).toBeInTheDocument();
    expect(screen.getByText("视频存储")).toBeInTheDocument();
    expect(screen.getByText("图片上传服务：MinIO")).toBeInTheDocument();
    expect(screen.getByText("视频上传服务：MinIO")).toBeInTheDocument();
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
    expect(screen.getByText("标题")).toBeInTheDocument();
    expect(screen.getByText("正文")).toBeInTheDocument();
    expect(screen.getByText("置顶动态")).toBeInTheDocument();
    expect(screen.getByText("置顶后会优先出现在首页、动态列表和内容库顶部。")).toBeInTheDocument();
    expect(screen.getAllByText("置顶").length).toBeGreaterThan(0);
    expect(screen.getByText("媒体文件")).toBeInTheDocument();
    expect(screen.getAllByText("停用").length).toBeGreaterThan(0);
    expect(screen.getAllByText("编辑").length).toBeGreaterThan(0);
    expect(screen.getAllByText("删除").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("内容类型"), { target: { value: "video" } });
    expect(screen.getByText("视频简介")).toBeInTheDocument();
    expect(screen.getByText("封面图片")).toBeInTheDocument();
    expect(screen.getByText("上传视频封面")).toBeInTheDocument();
    expect(screen.queryByText("置顶动态")).not.toBeInTheDocument();

    expect(screen.queryByText("Enable")).not.toBeInTheDocument();
    expect(screen.queryByText("Disable")).not.toBeInTheDocument();
    expect(screen.queryByText("图片地址")).not.toBeInTheDocument();
    expect(screen.queryByText("视频地址")).not.toBeInTheDocument();
    expect(screen.queryByText("Image URL")).not.toBeInTheDocument();
    expect(screen.queryByText("Media asset URL")).not.toBeInTheDocument();
    expect(screen.queryByText("video collections")).not.toBeInTheDocument();
  });

  it("filters the admin content library by query, type, and member tier", async () => {
    window.localStorage.clear();
    const dictionary = getDictionary("zh");

    render(
      <AppStateProvider>
        <AdminLoginProbe />
        <AdminPanel dictionary={dictionary} />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("内容管理")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("标题、正文或日期"), { target: { value: "会员" } });

    await waitFor(() => {
      expect(screen.getByText(/显示 3 \/ 8 条/)).toBeInTheDocument();
    });
    expect(screen.queryByText("公开更新：六月片场手记")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("筛选类型"), { target: { value: "album" } });
    expect(screen.getByText(/显示 1 \/ 8 条/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("会员等级"), { target: { value: "diamond" } });
    expect(screen.getByText(/显示 0 \/ 8 条/)).toBeInTheDocument();
    expect(screen.getByText("还没有内容")).toBeInTheDocument();
  });

  it("updates selected content visibility from the content library", async () => {
    window.localStorage.clear();
    const dictionary = getDictionary("zh");

    render(
      <AppStateProvider>
        <AdminLoginProbe />
        <AdminPanel dictionary={dictionary} />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("内容管理")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("选择内容: 公开更新：六月片场手记"));
    expect(screen.getByText("已选择 1 条内容")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("批量可见等级"), { target: { value: "diamond" } });
    fireEvent.click(screen.getByRole("button", { name: "批量改等级" }));

    await waitFor(() => {
      expect(screen.getByText("已更新 1 条内容。")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("会员等级"), { target: { value: "diamond" } });

    await waitFor(() => {
      expect(screen.getByText("公开更新：六月片场手记")).toBeInTheDocument();
    });
  });

  it("deletes selected content from the content library", async () => {
    window.localStorage.clear();
    const dictionary = getDictionary("zh");

    render(
      <AppStateProvider>
        <AdminLoginProbe />
        <AdminPanel dictionary={dictionary} />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("内容管理")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("选择内容: 公开更新：六月片场手记"));
    fireEvent.click(screen.getByRole("button", { name: "批量删除" }));

    await waitFor(() => {
      expect(screen.getByText("已删除 1 条内容。")).toBeInTheDocument();
    });
    expect(screen.queryByText("公开更新：六月片场手记")).not.toBeInTheDocument();
    expect(screen.getByText(/显示 7 \/ 7 条/)).toBeInTheDocument();
  });

  it("falls back from broken question-mark profile names in admin surfaces", async () => {
    window.localStorage.clear();
    mockRemoteAdminLoginWithBrokenName();
    const dictionary = getDictionary("zh");

    render(
      <AppStateProvider>
        <AdminLoginProbe remote />
        <AdminPanel dictionary={dictionary} />
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
        <AdminPanel dictionary={dictionary} />
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
        <AdminPanel dictionary={dictionary} />
      </AppStateProvider>
    );

    expect(screen.getByText("正在恢复管理员登录状态")).toBeInTheDocument();
    expect(screen.queryByText("权限不足")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("内容管理")).toBeInTheDocument();
    });
    expect(screen.queryByText("权限不足")).not.toBeInTheDocument();
  });

  it("uploads selected videos with MinIO without exposing the media access URL", async () => {
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
        <AdminPanel dictionary={dictionary} />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("内容管理")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("内容类型"), { target: { value: "video" } });
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
        <AdminPanel dictionary={dictionary} />
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
        <AdminPanel dictionary={dictionary} />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("内容管理")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("内容类型"), { target: { value: "video" } });
    const file = new File(["cover-bytes"], "video-cover.webp", { type: "image/webp" });
    fireEvent.change(screen.getByLabelText("上传视频封面"), {
      target: { files: [file] }
    });

    await waitFor(() => {
      expect(screen.getByText("视频封面已上传，可随视频发布。")).toBeInTheDocument();
    });
    expect(screen.getByText("已关联封面，发布后会显示在视频卡片上。")).toBeInTheDocument();
    expect(uploadImageFile).toHaveBeenCalledWith({
      accessToken: "cookie-session",
      file,
      onProgress: expect.any(Function),
      visibility: "gold"
    });
  });

  it("keeps the content form open and shows the backend error when remote publish fails", async () => {
    window.localStorage.clear();
    mockRemoteAdminLogin();
    vi.mocked(publishRemoteContent).mockRejectedValue(new Error("需要管理员权限"));
    const dictionary = getDictionary("zh");

    render(
      <AppStateProvider>
        <AdminLoginProbe remote />
        <AdminPanel dictionary={dictionary} />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("内容管理")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("标题"), { target: { value: "失败动态" } });
    fireEvent.change(screen.getByLabelText("正文"), { target: { value: "这条应该留在表单里" } });
    fireEvent.click(screen.getByRole("button", { name: "发布" }));

    await waitFor(() => {
      expect(screen.getByText("发布失败，请检查服务配置后重试。 需要管理员权限")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("失败动态")).toBeInTheDocument();
    expect(screen.getByDisplayValue("这条应该留在表单里")).toBeInTheDocument();
  });
});
