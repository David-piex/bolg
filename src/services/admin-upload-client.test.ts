import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  uploadImageFile,
  uploadVideoFile,
  validateImageFile,
  validateVideoFile,
  type UploadProgress
} from "@/services/admin-upload-client";

describe("admin upload client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uploads image files directly to MinIO and completes through the Java media API", async () => {
    const file = new File(["image-bytes"], "Cover.webp", { type: "image/webp" });
    const progress: UploadProgress[] = [];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          bucketName: "rinana-media",
          expiresAt: "2026-01-01T00:10:00Z",
          mediaType: "IMAGE",
          mimeType: "image/webp",
          objectKey: "images/cover.webp",
          uploadUrl: "http://minio.local/rinana-media/images/cover.webp?signature=test"
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "media-1",
          mediaType: "IMAGE",
          objectKey: "images/cover.webp",
          originalName: "Cover.webp"
        })
      );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
    const xhrLog = stubSuccessfulXhr();

    await expect(
      uploadImageFile({
        accessToken: "admin-access-token",
        file,
        onProgress: (nextProgress) => progress.push(nextProgress),
        visibility: "gold"
      })
    ).resolves.toEqual({
      mediaAssetId: "media-1",
      path: "images/cover.webp",
      publicUrl: "/api/media/media-1/view"
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/media/direct-uploads",
      expect.objectContaining({
        body: JSON.stringify({
          mediaType: "IMAGE",
          mimeType: "image/webp",
          originalName: "Cover.webp",
          sizeBytes: file.size
        }),
        credentials: "include",
        method: "POST"
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/media/direct-uploads/complete",
      expect.objectContaining({
        body: JSON.stringify({
          bucketName: "rinana-media",
          mediaType: "IMAGE",
          mimeType: "image/webp",
          objectKey: "images/cover.webp",
          originalName: "Cover.webp",
          sizeBytes: file.size
        }),
        credentials: "include",
        method: "POST"
      })
    );
    expect(xhrLog.method).toBe("PUT");
    expect(xhrLog.url).toBe("http://minio.local/rinana-media/images/cover.webp?signature=test");
    expect(xhrLog.headers).toEqual({ "Content-Type": "image/webp" });
    expect(xhrLog.body).toBe(file);
    expect(progress).toContainEqual({ phase: "preparing", percent: 3 });
    expect(progress).toContainEqual({ phase: "uploading", percent: 48 });
    expect(progress).toContainEqual({ phase: "finalizing", percent: 98 });
    expect(progress).toContainEqual({ phase: "complete", percent: 100 });
  });

  it("uploads video files directly to MinIO and completes through the Java media API", async () => {
    const file = new File(["video-bytes"], "Trailer.mp4", { type: "video/mp4" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          bucketName: "rinana-media",
          expiresAt: "2026-01-01T00:10:00Z",
          mediaType: "VIDEO",
          mimeType: "video/mp4",
          objectKey: "videos/trailer.mp4",
          uploadUrl: "http://minio.local/rinana-media/videos/trailer.mp4?signature=test"
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "media-2",
          mediaType: "VIDEO",
          objectKey: "videos/trailer.mp4",
          originalName: "Trailer.mp4"
        })
      );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
    stubSuccessfulXhr();

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

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/media/direct-uploads",
      expect.objectContaining({
        body: JSON.stringify({
          mediaType: "VIDEO",
          mimeType: "video/mp4",
          originalName: "Trailer.mp4",
          sizeBytes: file.size
        }),
        credentials: "include",
        method: "POST"
      })
    );
  });

  it("falls back to backend multipart upload when direct upload is unavailable", async () => {
    const file = new File(["video-bytes"], "Trailer.mp4", { type: "video/mp4" });
    const progress: UploadProgress[] = [];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ errorCode: "NOT_FOUND", message: "not found" }, 404))
      .mockResolvedValueOnce(
        jsonResponse({
          id: "media-fallback",
          mediaType: "VIDEO",
          objectKey: "videos/fallback.mp4",
          originalName: "Trailer.mp4"
        })
      );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(
      uploadVideoFile({
        accessToken: "admin-access-token",
        collectionId: "collection-1",
        file,
        onProgress: (nextProgress) => progress.push(nextProgress),
        visibility: "gold"
      })
    ).resolves.toEqual({
      mediaAssetId: "media-fallback",
      playbackUrl: "/api/media/media-fallback/view",
      thumbnailUrl: ""
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/media/videos",
      expect.objectContaining({
        body: expect.any(FormData),
        credentials: "include",
        method: "POST"
      })
    );
    expect(progress).toContainEqual({ phase: "preparing", percent: 3 });
    expect(progress).toContainEqual({ phase: "fallback", percent: 12 });
    expect(progress).toContainEqual({ phase: "complete", percent: 100 });
  });

  it("surfaces direct upload transfer failures instead of falling back", async () => {
    const file = new File(["video-bytes"], "Trailer.mp4", { type: "video/mp4" });
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        bucketName: "rinana-media",
        expiresAt: "2026-01-01T00:10:00Z",
        mediaType: "VIDEO",
        mimeType: "video/mp4",
        objectKey: "videos/trailer.mp4",
        uploadUrl: "http://minio.local/rinana-media/videos/trailer.mp4?signature=test"
      })
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    vi.stubGlobal(
      "XMLHttpRequest",
      class {
        onabort: (() => void) | null = null;
        onerror: (() => void) | null = null;
        onload: (() => void) | null = null;
        status = 500;
        upload = { onprogress: null as ((event: ProgressEvent) => void) | null };

        open() {}
        setRequestHeader() {}
        send() {
          this.onerror?.();
        }
      } as unknown as typeof XMLHttpRequest
    );

    await expect(
      uploadVideoFile({
        accessToken: "admin-access-token",
        collectionId: "collection-1",
        file,
        visibility: "gold"
      })
    ).rejects.toThrow("DIRECT_UPLOAD_PUT_FAILED");
  });

  it("surfaces direct upload endpoint errors other than 404", async () => {
    const file = new File(["video-bytes"], "Trailer.mp4", { type: "video/mp4" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ errorCode: "SERVER_ERROR", message: "temporary failure" }),
        status: 500
      })) as unknown as typeof fetch
    );

    await expect(
      uploadVideoFile({
        accessToken: "admin-access-token",
        collectionId: "collection-1",
        file,
        visibility: "gold"
      })
    ).rejects.toThrow("temporary failure");
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
    const file = new File([new Uint8Array(95 * 1024 * 1024 + 1)], "clip.mp4", { type: "video/mp4" });

    expect(validateVideoFile(file)).toBe("视频不能超过 95MB。");
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status
  });
}

function stubSuccessfulXhr() {
  const log = {
    body: undefined as Document | XMLHttpRequestBodyInit | null | undefined,
    headers: {} as Record<string, string>,
    method: "",
    url: ""
  };

  class SuccessfulXhr {
    onabort: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onload: (() => void) | null = null;
    status = 200;
    upload = {
      onprogress: null as ((event: ProgressEvent) => void) | null
    };

    open(method: string, url: string) {
      log.method = method;
      log.url = url;
    }

    setRequestHeader(name: string, value: string) {
      log.headers[name] = value;
    }

    send(body?: Document | XMLHttpRequestBodyInit | null) {
      log.body = body;
      this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 } as ProgressEvent);
      this.onload?.();
    }
  }

  vi.stubGlobal("XMLHttpRequest", SuccessfulXhr);
  return log;
}
