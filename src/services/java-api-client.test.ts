import { afterEach, describe, expect, it, vi } from "vitest";

import {
  JavaApiError,
  completeDirectUpload,
  createDirectUpload,
  createAlbum,
  createInvite,
  createPost,
  createVideo,
  getAlbum,
  getMe,
  getPost,
  getVideo,
  listMedia,
  listPosts,
  listAdminAuditLogs,
  listAdminUsers,
  login,
  register,
  updateUser,
  uploadImage,
  uploadVideo
} from "./java-api-client";

describe("java api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses same-origin auth endpoints with cookies", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        displayName: "alice",
        email: "alice@example.com",
        id: "user-1",
        memberLevel: "GOLD",
        role: "USER",
        username: "alice"
      })
    );

    await login({ account: "alice", password: "password123" });
    await register({
      email: "bob@example.com",
      inviteCode: "gold-code",
      password: "password123",
      username: "bob"
    });
    await getMe();

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/auth/login", expect.objectContaining({
      credentials: "include",
      method: "POST"
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/auth/register", expect.objectContaining({
      credentials: "include",
      method: "POST"
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/auth/me", expect.objectContaining({
      credentials: "include",
      method: "GET"
    }));
  });

  it("uses admin endpoints with cookies", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        code: "diamond-code",
        id: "invite-1",
        initialLevel: "DIAMOND",
        maxUses: 1,
        status: "ACTIVE",
        usedCount: 0
      })
    );

    await createInvite({ code: "diamond-code", initialLevel: "DIAMOND", maxUses: 1 });
    await listAdminUsers({ page: 1, q: "lin", size: 20 });
    await listAdminAuditLogs({ page: 2, size: 8 });
    await updateUser({ disabled: true, memberLevel: "GOLD", userId: "user-1" });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/admin/invites", expect.objectContaining({
      credentials: "include",
      method: "POST"
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/admin/users?page=1&size=20&q=lin", expect.objectContaining({
      credentials: "include",
      method: "GET"
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/admin/audit-logs?page=2&size=8", expect.objectContaining({
      credentials: "include",
      method: "GET"
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/admin/users/user-1", expect.objectContaining({
      credentials: "include",
      method: "PATCH"
    }));
  });

  it("turns backend error payloads into JavaApiError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ errorCode: "INVALID_INVITE_CODE", message: "邀请码无效" }, 400)
    );

    await expect(register({
      email: "bob@example.com",
      inviteCode: "bad",
      password: "password123",
      username: "bob"
    })).rejects.toMatchObject({
      errorCode: "INVALID_INVITE_CODE",
      message: "邀请码无效"
    } satisfies Partial<JavaApiError>);
  });

  it("uses a readable Chinese fallback when backend omits an error message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ errorCode: "REQUEST_FAILED" }, 500)
    );

    await expect(getMe()).rejects.toMatchObject({
      errorCode: "REQUEST_FAILED",
      message: "请求失败，请稍后重试"
    } satisfies Partial<JavaApiError>);
  });

  it("uploads images and videos through Java media endpoints with cookies", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        createdAt: "2026-01-01T00:00:00Z",
        id: "media-1",
        mediaType: "IMAGE",
        mimeType: "image/png",
        objectKey: "images/a.png",
        originalName: "a.png",
        sizeBytes: 3
      })
    );

    await uploadImage(new File(["abc"], "a.png", { type: "image/png" }));
    await uploadVideo(new File(["abc"], "a.mp4", { type: "video/mp4" }));
    await createDirectUpload({
      mediaType: "IMAGE",
      mimeType: "image/png",
      originalName: "a.png",
      sizeBytes: 3
    });
    await completeDirectUpload({
      bucketName: "rinana-media",
      mediaType: "IMAGE",
      mimeType: "image/png",
      objectKey: "images/a.png",
      originalName: "a.png",
      sizeBytes: 3
    });
    await listMedia({ mediaType: "IMAGE", page: 1, q: "cover", size: 8 });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/media/images", expect.objectContaining({
      credentials: "include",
      method: "POST"
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/media/videos", expect.objectContaining({
      credentials: "include",
      method: "POST"
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/media/direct-uploads", expect.objectContaining({
      credentials: "include",
      method: "POST"
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/media/direct-uploads/complete", expect.objectContaining({
      credentials: "include",
      method: "POST"
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(5, "/api/media?mediaType=IMAGE&page=1&size=8&q=cover", expect.objectContaining({
      credentials: "include",
      method: "GET"
    }));
  });

  it("creates content through Java content endpoints", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        content: "body",
        id: "post-1",
        publishedAt: "2026-01-01T00:00:00Z",
        title: "title",
        visibility: "GOLD"
      })
    );

    await createPost({ content: "body", title: "title", visibility: "GOLD" });
    await createAlbum({ coverMediaId: "media-image", description: "album", title: "album", visibility: "GOLD" });
    await createVideo({ description: "video", mediaAssetId: "media-video", title: "video", visibility: "DIAMOND" });
    await listPosts({ page: 2, q: "summer notes", size: 12, sort: "title" });
    await getPost("post 1");
    await getAlbum("album/1");
    await getVideo("video-1");

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/content/posts", expect.objectContaining({
      credentials: "include",
      method: "POST"
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/content/albums", expect.objectContaining({
      credentials: "include",
      method: "POST"
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/content/videos", expect.objectContaining({
      credentials: "include",
      method: "POST"
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/content/posts?page=2&size=12&q=summer+notes&sort=title", expect.objectContaining({
      credentials: "include",
      method: "GET"
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(5, "/api/content/posts/post%201", expect.objectContaining({
      credentials: "include",
      method: "GET"
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(6, "/api/content/albums/album%2F1", expect.objectContaining({
      credentials: "include",
      method: "GET"
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(7, "/api/content/videos/video-1", expect.objectContaining({
      credentials: "include",
      method: "GET"
    }));
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status
  });
}
