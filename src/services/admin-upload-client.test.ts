import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createImageUpload,
  createVideoUploadSignature,
  uploadImageFile,
  uploadVideoFile
} from "@/services/admin-upload-client";

describe("admin upload client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the admin bearer token when requesting Supabase image upload URLs", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        path: "gold/cover.webp",
        token: "signed-token",
        uploadUrl: "https://project.supabase.co/storage/v1/object/upload/sign/images/gold/cover.webp?token=signed-token"
      })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(
      createImageUpload({
        accessToken: "admin-access-token",
        contentType: "image/webp",
        fileName: "Cover.webp",
        visibility: "gold"
      })
    ).resolves.toMatchObject({
      path: "gold/cover.webp",
      token: "signed-token"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/supabase/image-upload",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer admin-access-token",
          "Content-Type": "application/json"
        },
        method: "POST"
      })
    );
  });

  it("sends the admin bearer token when requesting Cloudinary video signatures", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        apiKey: "api-key",
        cloudName: "demo-cloud",
        folder: "rinana/videos",
        publicId: "collection-1/trailer",
        resourceType: "video",
        signature: "signature",
        tags: ["visibility:gold", "collection:collection-1"],
        timestamp: 1_781_000_000,
        uploadUrl: "https://api.cloudinary.com/v1_1/demo-cloud/video/upload"
      })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(
      createVideoUploadSignature({
        accessToken: "admin-access-token",
        collectionId: "collection-1",
        fileName: "Trailer.mp4",
        visibility: "gold"
      })
    ).resolves.toMatchObject({
      publicId: "collection-1/trailer",
      signature: "signature"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cloudinary/video-signature",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer admin-access-token",
          "Content-Type": "application/json"
        },
        method: "POST"
      })
    );
  });

  it("uploads image files to signed Supabase Storage URLs and returns the public object URL", async () => {
    const file = new File(["image-bytes"], "Cover.webp", { type: "image/webp" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          path: "gold/cover.webp",
          token: "signed-token",
          uploadUrl: "https://project.supabase.co/storage/v1/object/upload/sign/images/gold/cover.webp?token=signed-token"
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(
      uploadImageFile({
        accessToken: "admin-access-token",
        file,
        visibility: "gold"
      })
    ).resolves.toEqual({
      path: "gold/cover.webp",
      publicUrl: "https://project.supabase.co/storage/v1/object/public/images/gold/cover.webp"
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://project.supabase.co/storage/v1/object/upload/sign/images/gold/cover.webp?token=signed-token",
      {
        body: file,
        headers: { "Content-Type": "image/webp" },
        method: "PUT"
      }
    );
  });

  it("uploads video files to Cloudinary with the signed payload and returns playback details", async () => {
    const file = new File(["video-bytes"], "Trailer.mp4", { type: "video/mp4" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          apiKey: "api-key",
          cloudName: "demo-cloud",
          folder: "rinana/videos",
          publicId: "collection-1/trailer",
          resourceType: "video",
          signature: "signature",
          tags: ["visibility:gold", "collection:collection-1"],
          timestamp: 1_781_000_000,
          uploadUrl: "https://api.cloudinary.com/v1_1/demo-cloud/video/upload"
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          public_id: "collection-1/trailer",
          secure_url: "https://res.cloudinary.com/demo-cloud/video/upload/rinana/videos/collection-1/trailer.mp4"
        })
      });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(
      uploadVideoFile({
        accessToken: "admin-access-token",
        collectionId: "collection-1",
        file,
        visibility: "gold"
      })
    ).resolves.toEqual({
      cloudinaryPublicId: "collection-1/trailer",
      playbackUrl: "https://res.cloudinary.com/demo-cloud/video/upload/rinana/videos/collection-1/trailer.mp4",
      thumbnailUrl: "https://res.cloudinary.com/demo-cloud/video/upload/so_0/collection-1/trailer.jpg"
    });

    const [, uploadOptions] = fetchMock.mock.calls[1];
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.cloudinary.com/v1_1/demo-cloud/video/upload",
      expect.objectContaining({
        body: expect.any(FormData),
        method: "POST"
      })
    );
    expect(uploadOptions.body.get("file")).toBe(file);
    expect(uploadOptions.body.get("api_key")).toBe("api-key");
    expect(uploadOptions.body.get("signature")).toBe("signature");
    expect(uploadOptions.body.get("public_id")).toBe("collection-1/trailer");
  });
});
