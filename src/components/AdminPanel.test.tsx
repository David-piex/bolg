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
    expect(screen.getByText("标题")).toBeInTheDocument();
    expect(screen.getByText("正文")).toBeInTheDocument();
    expect(screen.getByText("媒体文件")).toBeInTheDocument();
    expect(screen.getAllByText("停用").length).toBeGreaterThan(0);
    expect(screen.getAllByText("编辑").length).toBeGreaterThan(0);
    expect(screen.getAllByText("删除").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("内容类型"), { target: { value: "video" } });
    expect(screen.getByText("视频简介")).toBeInTheDocument();
    expect(screen.getByText("封面图片")).toBeInTheDocument();
    expect(screen.getByText("上传视频封面")).toBeInTheDocument();

    expect(screen.queryByText("Enable")).not.toBeInTheDocument();
    expect(screen.queryByText("Disable")).not.toBeInTheDocument();
    expect(screen.queryByText("图片地址")).not.toBeInTheDocument();
    expect(screen.queryByText("视频地址")).not.toBeInTheDocument();
    expect(screen.queryByText("Image URL")).not.toBeInTheDocument();
    expect(screen.queryByText("Media asset URL")).not.toBeInTheDocument();
    expect(screen.queryByText("video collections")).not.toBeInTheDocument();
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
    vi.mocked(uploadImageFile).mockImplementation(
      ({ onProgress }) =>
        new Promise((resolve) => {
          onProgress?.({ percent: 46, phase: "uploading" });
          setTimeout(() => {
            resolve({
              mediaAssetId: "media-image",
              path: "gold/cover.webp",
              publicUrl: "/api/media/media-image/view"
            });
          }, 50);
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
