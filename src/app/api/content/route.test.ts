import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/content/route";

vi.mock("@/services/supabase-content-boundary", () => ({
  fetchContentDataset: vi.fn()
}));

vi.mock("@/services/supabase-boundary", () => ({
  persistAlbumWithPhoto: vi.fn(),
  persistPost: vi.fn(),
  persistVideoCollectionWithVideo: vi.fn(),
  requireAdminRequest: vi.fn()
}));

const { fetchContentDataset } = await import("@/services/supabase-content-boundary");
const {
  persistAlbumWithPhoto,
  persistPost,
  persistVideoCollectionWithVideo,
  requireAdminRequest
} = await import("@/services/supabase-boundary");

describe("GET /api/content", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a Supabase content dataset for visitors", async () => {
    vi.mocked(fetchContentDataset).mockResolvedValue({
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
    });

    const response = await GET(new Request("http://localhost/api/content"));

    await expect(response.json()).resolves.toMatchObject({
      posts: [{ id: "post-1", visibility: "public" }]
    });
    expect(response.status).toBe(200);
    expect(fetchContentDataset).toHaveBeenCalledWith(undefined);
  });

  it("forwards bearer tokens for logged-in content reads", async () => {
    vi.mocked(fetchContentDataset).mockResolvedValue({
      albums: [],
      photos: [],
      posts: [],
      videoCollections: [],
      videos: []
    });

    const response = await GET(
      new Request("http://localhost/api/content", {
        headers: { Authorization: "Bearer member-token" }
      })
    );

    expect(response.status).toBe(200);
    expect(fetchContentDataset).toHaveBeenCalledWith("member-token");
  });

  it("returns a 503 when Supabase content reads are not configured", async () => {
    vi.mocked(fetchContentDataset).mockRejectedValue(new Error("Missing Supabase content environment variables"));

    const response = await GET(new Request("http://localhost/api/content"));

    await expect(response.json()).resolves.toEqual({
      error: "Supabase content is not configured"
    });
    expect(response.status).toBe(503);
  });
});

describe("POST /api/content", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(requireAdminRequest).mockResolvedValue({ userId: "admin-1" });
  });

  it("rejects missing admin authorization", async () => {
    vi.mocked(requireAdminRequest).mockRejectedValue(new Error("Admin authorization is required"));

    const response = await POST(
      new Request("http://localhost/api/content", {
        body: JSON.stringify({ kind: "post" }),
        method: "POST"
      })
    );

    expect(response.status).toBe(401);
  });

  it("persists admin posts through Supabase", async () => {
    vi.mocked(persistPost).mockResolvedValue({
      body: "Body",
      coverImage: "https://images.example/post.jpg",
      excerpt: "Body",
      id: "post-1",
      publishedAt: "2026-06-18",
      title: "Post title",
      type: "post",
      visibility: "gold"
    });

    const response = await POST(
      new Request("http://localhost/api/content", {
        body: JSON.stringify({
          body: "Body",
          coverImage: "https://images.example/post.jpg",
          kind: "post",
          title: "Post title",
          visibility: "gold"
        }),
        headers: { Authorization: "Bearer admin-token" },
        method: "POST"
      })
    );

    await expect(response.json()).resolves.toMatchObject({
      post: { id: "post-1", visibility: "gold" }
    });
    expect(response.status).toBe(200);
    expect(persistPost).toHaveBeenCalledWith({
      body: "Body",
      coverImage: "https://images.example/post.jpg",
      title: "Post title",
      userId: "admin-1",
      visibility: "gold"
    });
  });

  it("persists admin albums with their first photo", async () => {
    vi.mocked(persistAlbumWithPhoto).mockResolvedValue({
      album: {
        coverImage: "https://images.example/album.jpg",
        defaultVisibility: "diamond",
        description: "Album description",
        id: "album-1",
        publishedAt: "2026-06-18",
        title: "Album title"
      },
      photo: {
        albumId: "album-1",
        id: "photo-1",
        imageUrl: "https://images.example/album.jpg",
        sortOrder: 1,
        title: "Photo title",
        visibilityOverride: null
      }
    });

    const response = await POST(
      new Request("http://localhost/api/content", {
        body: JSON.stringify({
          description: "Album description",
          imageUrl: "https://images.example/album.jpg",
          kind: "album",
          photoTitle: "Photo title",
          title: "Album title",
          visibility: "diamond"
        }),
        method: "POST"
      })
    );

    expect(response.status).toBe(200);
    expect(persistAlbumWithPhoto).toHaveBeenCalledWith(expect.objectContaining({ userId: "admin-1" }));
  });

  it("persists admin video collections with their first video", async () => {
    vi.mocked(persistVideoCollectionWithVideo).mockResolvedValue({
      collection: {
        coverImage: "https://res.cloudinary.com/demo/video/upload/so_0/sample.jpg",
        defaultVisibility: "gold",
        description: "Video description",
        id: "collection-1",
        publishedAt: "2026-06-18",
        title: "Video collection"
      },
      video: {
        cloudinaryPublicId: "ayana/video-1",
        collectionId: "collection-1",
        description: "Video description",
        id: "video-1",
        playbackUrl: "https://res.cloudinary.com/demo/video/upload/sample.mp4",
        processingState: "ready",
        sortOrder: 1,
        thumbnailUrl: "https://res.cloudinary.com/demo/video/upload/so_0/sample.jpg",
        title: "Video title",
        visibilityOverride: null
      }
    });

    const response = await POST(
      new Request("http://localhost/api/content", {
        body: JSON.stringify({
          cloudinaryPublicId: "ayana/video-1",
          description: "Video description",
          kind: "video",
          playbackUrl: "https://res.cloudinary.com/demo/video/upload/sample.mp4",
          thumbnailUrl: "https://res.cloudinary.com/demo/video/upload/so_0/sample.jpg",
          title: "Video collection",
          videoTitle: "Video title",
          visibility: "gold"
        }),
        method: "POST"
      })
    );

    expect(response.status).toBe(200);
    expect(persistVideoCollectionWithVideo).toHaveBeenCalledWith(expect.objectContaining({ userId: "admin-1" }));
  });
});
