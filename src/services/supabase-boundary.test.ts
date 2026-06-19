import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createInviteCode,
  requireAdminRequest,
  createSignedImageUpload,
  persistAlbumWithPhoto,
  persistContentRecord,
  persistPost,
  persistVideoCollectionWithVideo,
  updateProfileLevel
} from "@/services/supabase-boundary";

const originalEnv = { ...process.env };

describe("supabase boundary", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  });

  it("creates invite codes through the Supabase REST API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => [
          {
            id: "invite-1",
            code: "GOLD-2026",
            target_level: "gold",
            used_by_user_id: null,
            note: "黄金"
          }
        ]
      })) as unknown as typeof fetch
    );

    const invite = await createInviteCode({ code: "GOLD-2026", targetLevel: "gold", note: "黄金" });

    expect(invite).toEqual({
      code: "GOLD-2026",
      id: "invite-1",
      note: "黄金",
      targetLevel: "gold",
      usedByUserId: null
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://project.supabase.co/rest/v1/invite_codes?select=*",
      expect.objectContaining({
        body: JSON.stringify({ code: "GOLD-2026", note: "黄金", target_level: "gold" }),
        headers: expect.objectContaining({
          apikey: "service-role",
          Authorization: "Bearer service-role",
          Prefer: "return=representation"
        }),
        method: "POST"
      })
    );
  });

  it("accepts only enabled admin bearer tokens for server-side actions", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "admin-1" } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ disabled: false, is_admin: true }]
      });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(
      requireAdminRequest(
        new Request("http://localhost/api/private", {
          headers: { Authorization: "Bearer user-session-token" }
        })
      )
    ).resolves.toEqual({ userId: "admin-1" });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://project.supabase.co/auth/v1/user",
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: "service-role",
          Authorization: "Bearer user-session-token"
        })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://project.supabase.co/rest/v1/profiles?id=eq.admin-1&select=is_admin,disabled",
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: "service-role",
          Authorization: "Bearer service-role"
        })
      })
    );
  });

  it("rejects missing admin bearer tokens before calling Supabase", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(requireAdminRequest(new Request("http://localhost/api/private"))).rejects.toThrow(
      "Admin authorization is required"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-admin bearer tokens", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: { id: "user-1" } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ disabled: false, is_admin: false }]
        }) as unknown as typeof fetch
    );

    await expect(
      requireAdminRequest(
        new Request("http://localhost/api/private", {
          headers: { Authorization: "Bearer user-session-token" }
        })
      )
    ).rejects.toThrow("Admin authorization is required");
  });

  it("updates profile levels with admin-only fields", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => "" })) as unknown as typeof fetch);

    await updateProfileLevel({ userId: "user-1", level: "diamond", disabled: true });

    const [, options] = vi.mocked(fetch).mock.calls[0];

    expect(fetch).toHaveBeenCalledWith(
      "https://project.supabase.co/rest/v1/profiles?id=eq.user-1",
      expect.objectContaining({
        method: "PATCH"
      })
    );
    expect(JSON.parse(String(options?.body))).toEqual({ disabled: true, level: "diamond" });
  });

  it("creates signed Supabase image upload paths without uploading the file from the server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ signedURL: "/storage/v1/object/upload/sign/images/gold/photo.webp?token=abc" })
      })) as unknown as typeof fetch
    );

    const signed = await createSignedImageUpload({
      contentType: "image/webp",
      fileName: "Cover Photo.webp",
      visibility: "gold"
    });

    expect(signed).toEqual({
      path: "gold/cover-photo.webp",
      token: "abc",
      uploadUrl: "https://project.supabase.co/storage/v1/object/upload/sign/images/gold/photo.webp?token=abc"
    });
  });

  it("persists content records through a whitelisted Supabase table", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => "" })) as unknown as typeof fetch);

    await persistContentRecord("posts", { title: "发布", visibility: "gold" });

    expect(fetch).toHaveBeenCalledWith(
      "https://project.supabase.co/rest/v1/posts",
      expect.objectContaining({
        body: JSON.stringify({ title: "发布", visibility: "gold" }),
        method: "POST"
      })
    );
  });

  it("persists posts and returns the created content record", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => [
          {
            body: "Body",
            cover_image: "https://images.example/post.jpg",
            excerpt: "Body",
            id: "post-1",
            published_at: "2026-06-18T00:00:00+00:00",
            title: "Post title",
            visibility: "gold"
          }
        ]
      })) as unknown as typeof fetch
    );

    const post = await persistPost({
      body: "Body",
      coverImage: "https://images.example/post.jpg",
      title: "Post title",
      userId: "admin-1",
      visibility: "gold"
    });

    expect(post).toMatchObject({
      body: "Body",
      coverImage: "https://images.example/post.jpg",
      id: "post-1",
      title: "Post title",
      type: "post",
      visibility: "gold"
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://project.supabase.co/rest/v1/posts?select=id,title,excerpt,body,cover_image,visibility,published_at",
      expect.objectContaining({
        headers: expect.objectContaining({ Prefer: "return=representation" }),
        method: "POST"
      })
    );
    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(options?.body))).toEqual({
      body: "Body",
      cover_image: "https://images.example/post.jpg",
      created_by_user_id: "admin-1",
      excerpt: "Body",
      title: "Post title",
      visibility: "gold"
    });
  });

  it("persists an album and its first photo", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              cover_image: "https://images.example/album.jpg",
              default_visibility: "diamond",
              description: "Album description",
              id: "album-1",
              published_at: "2026-06-18T00:00:00+00:00",
              title: "Album title"
            }
          ]
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              album_id: "album-1",
              id: "photo-1",
              image_url: "https://images.example/album.jpg",
              sort_order: 1,
              title: "Photo title",
              visibility_override: null
            }
          ]
        }) as unknown as typeof fetch
    );

    const created = await persistAlbumWithPhoto({
      description: "Album description",
      imageUrl: "https://images.example/album.jpg",
      photoTitle: "Photo title",
      title: "Album title",
      userId: "admin-1",
      visibility: "diamond"
    });

    expect(created.album).toMatchObject({
      coverImage: "https://images.example/album.jpg",
      defaultVisibility: "diamond",
      id: "album-1"
    });
    expect(created.photo).toMatchObject({
      albumId: "album-1",
      id: "photo-1",
      imageUrl: "https://images.example/album.jpg"
    });
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://project.supabase.co/rest/v1/photos?select=id,album_id,title,image_url,visibility_override,sort_order",
      expect.objectContaining({
        body: JSON.stringify({
          album_id: "album-1",
          image_url: "https://images.example/album.jpg",
          sort_order: 1,
          title: "Photo title",
          visibility_override: null
        }),
        method: "POST"
      })
    );
  });

  it("persists a video collection and its first Cloudinary video", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              cover_image: "https://res.cloudinary.com/demo/video/upload/so_0/sample.jpg",
              default_visibility: "gold",
              description: "Video description",
              id: "collection-1",
              published_at: "2026-06-18T00:00:00+00:00",
              title: "Video collection"
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
              title: "Video title",
              visibility_override: null
            }
          ]
        }) as unknown as typeof fetch
    );

    const created = await persistVideoCollectionWithVideo({
      cloudinaryPublicId: "ayana/video-1",
      description: "Video description",
      playbackUrl: "https://res.cloudinary.com/demo/video/upload/sample.mp4",
      thumbnailUrl: "https://res.cloudinary.com/demo/video/upload/so_0/sample.jpg",
      title: "Video collection",
      userId: "admin-1",
      videoTitle: "Video title",
      visibility: "gold"
    });

    expect(created.collection).toMatchObject({
      defaultVisibility: "gold",
      id: "collection-1"
    });
    expect(created.video).toMatchObject({
      cloudinaryPublicId: "ayana/video-1",
      collectionId: "collection-1",
      processingState: "ready"
    });
  });

  it("rejects unconfigured Supabase credentials", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    await expect(updateProfileLevel({ userId: "user-1", level: "gold" })).rejects.toThrow(
      "Missing Supabase environment variables"
    );
  });

  it("rejects unknown content tables", async () => {
    await expect(persistContentRecord("profiles", { is_admin: true })).rejects.toThrow("Unsupported Supabase table");
  });
});
