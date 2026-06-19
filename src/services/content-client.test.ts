import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchRemoteContentDataset, publishRemoteContent } from "@/services/content-client";

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
            body: "Body",
            coverImage: "https://images.example/post.jpg",
            excerpt: "Excerpt",
            id: "post-1",
            publishedAt: "2026-06-18",
            title: "Public post",
            type: "post",
            visibility: "public"
          }
        ],
        videoCollections: [],
        videos: []
      })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(fetchRemoteContentDataset()).resolves.toMatchObject({
      posts: [{ id: "post-1", visibility: "public" }]
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/content", {
      headers: {},
      method: "GET"
    });
  });

  it("sends the auth token when loading member-visible content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ albums: [], photos: [], posts: [], videoCollections: [], videos: [] })
      })) as unknown as typeof fetch
    );

    await fetchRemoteContentDataset("member-token");

    expect(fetch).toHaveBeenCalledWith("/api/content", {
      headers: { Authorization: "Bearer member-token" },
      method: "GET"
    });
  });

  it("surfaces content API errors for local fallback handling", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: "Supabase content is not configured" })
      })) as unknown as typeof fetch
    );

    await expect(fetchRemoteContentDataset()).rejects.toThrow("Supabase content is not configured");
  });

  it("publishes admin content with the Supabase admin session token", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        post: {
          body: "Body",
          coverImage: "https://images.example/post.jpg",
          excerpt: "Body",
          id: "post-1",
          publishedAt: "2026-06-18",
          title: "Post title",
          type: "post",
          visibility: "gold"
        }
      })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(
      publishRemoteContent("admin-token", {
        body: "Body",
        coverImage: "https://images.example/post.jpg",
        kind: "post",
        title: "Post title",
        visibility: "gold"
      })
    ).resolves.toMatchObject({
      post: { id: "post-1", visibility: "gold" }
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/content", {
      body: JSON.stringify({
        body: "Body",
        coverImage: "https://images.example/post.jpg",
        kind: "post",
        title: "Post title",
        visibility: "gold"
      }),
      headers: {
        Authorization: "Bearer admin-token",
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  });
});
