import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchContentDataset } from "@/services/supabase-content-boundary";

const originalEnv = { ...process.env };

describe("supabase content boundary", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("fetches public content through Supabase RLS with the anon key", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            body: "Body",
            cover_image: "https://images.example/post.jpg",
            excerpt: "Excerpt",
            id: "post-1",
            published_at: "2026-06-18",
            title: "Public post",
            visibility: "public"
          }
        ]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            cover_image: "https://images.example/album.jpg",
            default_visibility: "gold",
            description: "Album description",
            id: "album-1",
            published_at: "2026-06-17",
            title: "Gold album"
          }
        ]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            album_id: "album-1",
            id: "photo-1",
            image_url: "https://images.example/photo.jpg",
            sort_order: 1,
            title: "Photo",
            visibility_override: "diamond"
          }
        ]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            cover_image: "https://images.example/videos.jpg",
            default_visibility: "normal",
            description: "Video collection description",
            id: "collection-1",
            published_at: "2026-06-16",
            title: "Normal videos"
          }
        ]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            cloudinary_public_id: "ayana/video-1",
            collection_id: "collection-1",
            description: "Video description",
            id: "video-1",
            playback_url: "https://res.cloudinary.com/demo/video/upload/sample.mp4",
            processing_state: "ready",
            sort_order: 1,
            thumbnail_url: "https://res.cloudinary.com/demo/video/upload/so_0/sample.jpg",
            title: "Video",
            visibility_override: null
          }
        ]
      });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const dataset = await fetchContentDataset();

    expect(dataset.posts).toEqual([
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
    ]);
    expect(dataset.albums?.[0]).toMatchObject({
      coverImage: "https://images.example/album.jpg",
      defaultVisibility: "gold",
      id: "album-1"
    });
    expect(dataset.photos?.[0]).toMatchObject({
      albumId: "album-1",
      imageUrl: "https://images.example/photo.jpg",
      visibilityOverride: "diamond"
    });
    expect(dataset.videoCollections?.[0]).toMatchObject({
      defaultVisibility: "normal",
      id: "collection-1"
    });
    expect(dataset.videos?.[0]).toMatchObject({
      cloudinaryPublicId: "ayana/video-1",
      collectionId: "collection-1",
      processingState: "ready"
    });
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://project.supabase.co/rest/v1/posts?select=id,title,excerpt,body,cover_image,visibility,published_at&order=published_at.desc",
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: "anon-key",
          Authorization: "Bearer anon-key"
        })
      })
    );
  });

  it("forwards the logged-in user token so Supabase RLS can reveal member content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => []
      })) as unknown as typeof fetch
    );

    await fetchContentDataset("member-access-token");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/rest/v1/posts"),
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: "anon-key",
          Authorization: "Bearer member-access-token"
        })
      })
    );
  });

  it("rejects missing Supabase public content credentials", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    await expect(fetchContentDataset()).rejects.toThrow("Missing Supabase content environment variables");
  });
});
