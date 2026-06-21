import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteRemoteContent,
  fetchRemoteAlbumDetail,
  fetchRemotePostsPage,
  fetchRemoteContentDataset,
  fetchRemotePostDetail,
  fetchRemoteVideoDetail,
  javaVideoIdFromCollectionId,
  publishRemoteContent,
  updateRemoteContent
} from "@/services/content-client";

describe("content client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads visitor-visible content from the local content API", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        albums: [],
        photos: [],
        posts: [
          {
            content: "Body",
            id: "post-1",
            pinned: true,
            publishedAt: "2026-06-18T00:00:00Z",
            title: "Public post",
            visibility: "PUBLIC"
          }
        ],
        videos: []
      })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(fetchRemoteContentDataset()).resolves.toMatchObject({
      posts: [{ id: "post-1", pinned: true, visibility: "public" }]
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/content", {
      credentials: "include",
      headers: expect.any(Headers),
      method: "GET"
    });
  });

  it("loads member-visible content with the Java cookie session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ albums: [], posts: [], videos: [] })
      })) as unknown as typeof fetch
    );

    await fetchRemoteContentDataset("member-token");

    expect(fetch).toHaveBeenCalledWith("/api/content", {
      credentials: "include",
      headers: expect.any(Headers),
      method: "GET"
    });
  });

  it("uses stable media view URLs without resolving every asset during feed load", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        albums: [
          {
            coverMediaId: "media-image",
            description: "Album body",
            id: "album-1",
            publishedAt: "2026-06-18T00:00:00Z",
            title: "Album title",
            visibility: "GOLD"
          }
        ],
        posts: [],
        videos: []
      })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(fetchRemoteContentDataset("member-token")).resolves.toMatchObject({
      albums: [
        {
          coverImage: "/api/media/media-image/view",
          id: "album-1"
        }
      ]
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses renderable media view URLs for uploaded videos", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        albums: [],
        posts: [],
        videos: [
          {
            coverMediaId: "media-cover",
            description: "Video body",
            id: "video-1",
            mediaAssetId: "media-video",
            publishedAt: "2026-06-18T00:00:00Z",
            title: "Video title",
            visibility: "GOLD"
          }
        ]
      })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(fetchRemoteContentDataset("member-token")).resolves.toMatchObject({
      videoCollections: [
        {
          coverImage: "/api/media/media-cover/view",
          id: "collection-video-1"
        }
      ],
      videos: [
        {
          playbackUrl: "/api/media/media-video/view",
          thumbnailUrl: "/api/media/media-cover/view"
        }
      ]
    });
  });

  it("surfaces content API errors for local fallback handling", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ errorCode: "CONTENT_UNAVAILABLE", message: "Content API failed" })
      })) as unknown as typeof fetch
    );

    await expect(fetchRemoteContentDataset()).rejects.toThrow("Content API failed");
  });

  it("loads paged posts from the Java content API", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        items: [
          {
            content: "Body",
            id: "post-1",
            mediaAssetIds: [],
            pinned: false,
            publishedAt: "2026-06-18T00:00:00Z",
            title: "Paged post",
            visibility: "PUBLIC"
          }
        ],
        page: 1,
        size: 12,
        total: 13,
        totalPages: 2
      })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(fetchRemotePostsPage({ page: 1, size: 12 })).resolves.toMatchObject({
      items: [{ id: "post-1", visibility: "public" }],
      page: 1,
      total: 13,
      totalPages: 2
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/content/posts?page=1&size=12", {
      credentials: "include",
      headers: expect.any(Headers),
      method: "GET"
    });
  });

  it("loads single content details from the Java content API", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);

      if (path.endsWith("/posts/post-1")) {
        return {
          ok: true,
          json: async () => ({
            content: "Remote post body",
            id: "post-1",
            mediaAssetIds: ["media-post"],
            pinned: true,
            publishedAt: "2026-06-18T00:00:00Z",
            title: "Remote post",
            visibility: "PUBLIC"
          })
        };
      }

      if (path.endsWith("/albums/album-1")) {
        return {
          ok: true,
          json: async () => ({
            coverMediaId: "media-cover",
            description: "Remote album body",
            id: "album-1",
            publishedAt: "2026-06-18T00:00:00Z",
            title: "Remote album",
            visibility: "GOLD"
          })
        };
      }

      return {
        ok: true,
        json: async () => ({
          coverMediaId: "media-video-cover",
          description: "Remote video body",
          id: "video-1",
          mediaAssetId: "media-video",
          publishedAt: "2026-06-18T00:00:00Z",
          title: "Remote video",
          visibility: "NORMAL"
        })
      };
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(fetchRemotePostDetail("post-1")).resolves.toMatchObject({
      kind: "post",
      post: {
        coverImage: "/api/media/media-post/view",
        id: "post-1",
        title: "Remote post"
      }
    });
    await expect(fetchRemoteAlbumDetail("album-1")).resolves.toMatchObject({
      album: {
        coverImage: "/api/media/media-cover/view",
        id: "album-1"
      },
      kind: "album",
      photos: [{ imageUrl: "/api/media/media-cover/view" }]
    });
    await expect(fetchRemoteVideoDetail("collection-video-1")).resolves.toMatchObject({
      collection: {
        id: "collection-video-1",
        title: "Remote video"
      },
      kind: "video",
      videos: [{ id: "video-1", playbackUrl: "/api/media/media-video/view" }]
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/content/posts/post-1", expect.objectContaining({
      credentials: "include",
      method: "GET"
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/content/albums/album-1", expect.objectContaining({
      credentials: "include",
      method: "GET"
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/content/videos/video-1", expect.objectContaining({
      credentials: "include",
      method: "GET"
    }));
  });

  it("converts frontend video collection ids to Java video ids", () => {
    expect(javaVideoIdFromCollectionId("collection-video-1")).toBe("video-1");
    expect(javaVideoIdFromCollectionId("video-1")).toBe("video-1");
  });

  it("publishes admin posts through the Java content API", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        content: "Body",
        id: "post-1",
        mediaAssetIds: ["media-post-image"],
        pinned: true,
        publishedAt: "2026-06-18T00:00:00Z",
        status: "PUBLISHED",
        title: "Post title",
        visibility: "GOLD"
      })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(
      publishRemoteContent("admin-token", {
        body: "Body",
        coverImage: "https://images.example/post.jpg",
        kind: "post",
        mediaAssetId: "media-post-image",
        pinned: true,
        title: "Post title",
        visibility: "gold"
      })
    ).resolves.toMatchObject({
      post: { id: "post-1", visibility: "gold" }
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/content/posts", {
      body: JSON.stringify({
        content: "Body",
        mediaAssetIds: ["media-post-image"],
        pinned: true,
        status: "PUBLISHED",
        title: "Post title",
        visibility: "GOLD"
      }),
      credentials: "include",
      headers: expect.any(Headers),
      method: "POST"
    });
  });

  it("sends scheduled content timestamps to the Java content API", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        content: "Body",
        id: "post-1",
        mediaAssetIds: [],
        pinned: false,
        publishedAt: null,
        scheduledAt: "2026-06-30T08:00:00Z",
        status: "SCHEDULED",
        title: "Post title",
        visibility: "GOLD"
      })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(
      publishRemoteContent("admin-token", {
        body: "Body",
        kind: "post",
        scheduledAt: "2026-06-30T08:00:00Z",
        title: "Post title",
        visibility: "gold"
      })
    ).resolves.toMatchObject({
      post: { id: "post-1", status: "scheduled" }
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/content/posts", {
      body: JSON.stringify({
        content: "Body",
        scheduledAt: "2026-06-30T08:00:00Z",
        status: "PUBLISHED",
        title: "Post title",
        visibility: "GOLD"
      }),
      credentials: "include",
      headers: expect.any(Headers),
      method: "POST"
    });
  });

  it("publishes albums with uploaded image media ids as Java cover media", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        coverMediaId: "media-image",
        description: "Album body",
        id: "album-1",
        publishedAt: "2026-06-18T00:00:00Z",
        status: "DRAFT",
        title: "Album title",
        visibility: "GOLD"
      })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(
      publishRemoteContent("admin-token", {
        description: "Album body",
        imageUrl: "/api/media/media-image/access",
        kind: "album",
        mediaAssetId: "media-image",
        photoTitle: "Cover",
        status: "draft",
        title: "Album title",
        visibility: "gold"
      })
    ).resolves.toMatchObject({
      album: { coverImage: "/api/media/media-image/view", id: "album-1", status: "draft" }
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/content/albums", {
      body: JSON.stringify({
        coverMediaId: "media-image",
        description: "Album body",
        status: "DRAFT",
        title: "Album title",
        visibility: "GOLD"
      }),
      credentials: "include",
      headers: expect.any(Headers),
      method: "POST"
    });
  });

  it("updates admin content through the Java content API", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        content: "Updated body",
        id: "post-1",
        pinned: false,
        publishedAt: "2026-06-18T00:00:00Z",
        status: "PUBLISHED",
        title: "Updated post",
        visibility: "DIAMOND"
      })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await updateRemoteContent("admin-token", {
      body: "Updated body",
      coverImage: "https://images.example/post.jpg",
      id: "post-1",
      kind: "post",
      pinned: false,
      status: "published",
      title: "Updated post",
      visibility: "diamond"
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/content/posts/post-1", {
      body: JSON.stringify({
        content: "Updated body",
        pinned: false,
        status: "PUBLISHED",
        title: "Updated post",
        visibility: "DIAMOND"
      }),
      credentials: "include",
      headers: expect.any(Headers),
      method: "PATCH"
    });
  });

  it("deletes admin content through the Java content API", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await deleteRemoteContent("admin-token", { id: "album-1", kind: "album" });

    expect(fetchMock).toHaveBeenCalledWith("/api/content/albums/album-1", {
      credentials: "include",
      headers: expect.any(Headers),
      method: "DELETE"
    });
  });
});
