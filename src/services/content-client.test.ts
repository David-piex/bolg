import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteRemoteContent,
  fetchRemoteContentDataset,
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
      posts: [{ id: "post-1", visibility: "public" }]
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

  it("publishes admin posts through the Java content API", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        content: "Body",
        id: "post-1",
        mediaAssetIds: ["media-post-image"],
        publishedAt: "2026-06-18T00:00:00Z",
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
        title: "Album title",
        visibility: "gold"
      })
    ).resolves.toMatchObject({
      album: { coverImage: "/api/media/media-image/view", id: "album-1" }
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/content/albums", {
      body: JSON.stringify({
        coverMediaId: "media-image",
        description: "Album body",
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
        publishedAt: "2026-06-18T00:00:00Z",
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
      title: "Updated post",
      visibility: "diamond"
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/content/posts/post-1", {
      body: JSON.stringify({
        content: "Updated body",
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
