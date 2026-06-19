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

const { uploadImageFile, uploadVideoFile } = await import("@/services/admin-upload-client");

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

describe("AdminPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders Chinese admin controls after an admin logs in", async () => {
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

    expect(screen.getByText("图片存储")).toBeInTheDocument();
    expect(screen.getByText("视频存储")).toBeInTheDocument();
    expect(screen.getByText("图片上传服务：Supabase")).toBeInTheDocument();
    expect(screen.getByText("视频上传服务：Cloudinary")).toBeInTheDocument();
    expect(screen.getByText("图片地址")).toBeInTheDocument();
    expect(screen.getAllByText("停用").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("内容类型"), { target: { value: "video" } });
    expect(screen.getByText("视频地址")).toBeInTheDocument();

    expect(screen.queryByText("Enable")).not.toBeInTheDocument();
    expect(screen.queryByText("Disable")).not.toBeInTheDocument();
    expect(screen.queryByText("Image URL")).not.toBeInTheDocument();
    expect(screen.queryByText("图片 URL")).not.toBeInTheDocument();
    expect(screen.queryByText("Cloudinary URL")).not.toBeInTheDocument();
    expect(screen.queryByText("video collections")).not.toBeInTheDocument();
  });

  it("uploads selected images with the admin session and fills the image URL", async () => {
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          accessToken: "admin-access-token",
          expiresIn: 3600,
          profile: {
            disabled: false,
            displayName: "Admin",
            email: "admin@example.com",
            isAdmin: true,
            level: "diamond",
            userId: "admin-1"
          },
          refreshToken: "refresh-token"
        })
      })) as unknown as typeof fetch
    );
    vi.mocked(uploadImageFile).mockResolvedValue({
      path: "gold/cover.webp",
      publicUrl: "https://project.supabase.co/storage/v1/object/public/images/gold/cover.webp"
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
      expect(screen.getByDisplayValue("https://project.supabase.co/storage/v1/object/public/images/gold/cover.webp")).toBeInTheDocument();
    });
    expect(uploadImageFile).toHaveBeenCalledWith({
      accessToken: "admin-access-token",
      file,
      visibility: "gold"
    });
  });

  it("uploads selected videos with Cloudinary and fills the video URL", async () => {
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          accessToken: "admin-access-token",
          expiresIn: 3600,
          profile: {
            disabled: false,
            displayName: "Admin",
            email: "admin@example.com",
            isAdmin: true,
            level: "diamond",
            userId: "admin-1"
          },
          refreshToken: "refresh-token"
        })
      })) as unknown as typeof fetch
    );
    vi.mocked(uploadVideoFile).mockResolvedValue({
      cloudinaryPublicId: "collection-1/trailer",
      playbackUrl: "https://res.cloudinary.com/demo/video/upload/trailer.mp4",
      thumbnailUrl: "https://res.cloudinary.com/demo/video/upload/so_0/trailer.jpg"
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
      expect(screen.getByDisplayValue("https://res.cloudinary.com/demo/video/upload/trailer.mp4")).toBeInTheDocument();
    });
    expect(uploadVideoFile).toHaveBeenCalledWith({
      accessToken: "admin-access-token",
      collectionId: expect.stringMatching(/^draft-video-/),
      file,
      visibility: "gold"
    });
  });
});
