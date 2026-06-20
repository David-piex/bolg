import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateImageFile, validateVideoFile, uploadImageFile, uploadVideoFile } from "@/services/admin-upload-client";

describe("admin upload client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uploads image files directly through the Java media API", async () => {
    const file = new File(["image-bytes"], "Cover.webp", { type: "image/webp" });
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        id: "media-1",
        mediaType: "IMAGE",
        objectKey: "images/cover.webp",
        originalName: "Cover.webp"
      })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(
      uploadImageFile({
        accessToken: "admin-access-token",
        file,
        visibility: "gold"
      })
    ).resolves.toEqual({
      mediaAssetId: "media-1",
      path: "images/cover.webp",
      publicUrl: "/api/media/media-1/view"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/media/images",
      expect.objectContaining({
        body: expect.any(FormData),
        credentials: "include",
        method: "POST"
      })
    );
  });

  it("uploads video files directly through the Java media API", async () => {
    const file = new File(["video-bytes"], "Trailer.mp4", { type: "video/mp4" });
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        id: "media-2",
        mediaType: "VIDEO",
        objectKey: "videos/trailer.mp4",
        originalName: "Trailer.mp4"
      })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(
      uploadVideoFile({
        accessToken: "admin-access-token",
        collectionId: "collection-1",
        file,
        visibility: "gold"
      })
    ).resolves.toEqual({
      mediaAssetId: "media-2",
      playbackUrl: "/api/media/media-2/view",
      thumbnailUrl: ""
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/media/videos",
      expect.objectContaining({
        body: expect.any(FormData),
        credentials: "include",
        method: "POST"
      })
    );
  });

  it("rejects unsupported image file types before upload", () => {
    const file = new File(["image-bytes"], "photo.heic", { type: "image/heic" });

    expect(validateImageFile(file)).toBe("图片只支持 JPG、PNG、WebP 或 GIF。");
  });

  it("rejects images over the configured image upload limit before upload", () => {
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "photo.png", { type: "image/png" });

    expect(validateImageFile(file)).toBe("图片不能超过 10MB。");
  });

  it("rejects videos over the configured video upload limit before upload", () => {
    const file = new File([new Uint8Array(100 * 1024 * 1024 + 1)], "clip.mp4", { type: "video/mp4" });

    expect(validateVideoFile(file)).toBe("视频不能超过 100MB。");
  });
});
