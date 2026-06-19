import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/cloudinary/video-metadata/route";

const originalEnv = { ...process.env };

function mockAdminFetch(finalResponse: unknown) {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "admin-1" } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ disabled: false, is_admin: true }]
      })
      .mockResolvedValueOnce(finalResponse) as unknown as typeof fetch
  );
}

describe("POST /api/cloudinary/video-metadata", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    process.env.CLOUDINARY_CLOUD_NAME = "demo-cloud";
    process.env.CLOUDINARY_API_KEY = "api-key";
    process.env.CLOUDINARY_API_SECRET = "api-secret";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  });

  it("requires an admin bearer token before fetching Cloudinary video metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          public_id: "rinana/videos/clip",
          secure_url: "https://res.cloudinary.com/demo/video/upload/v1/clip.mp4",
          status: "active"
        })
      })) as unknown as typeof fetch
    );

    const response = await POST(
      new Request("http://localhost/api/cloudinary/video-metadata", {
        body: JSON.stringify({ publicId: "rinana/videos/clip" }),
        method: "POST"
      })
    );

    expect(response.status).toBe(401);
  });

  it("returns normalized Cloudinary video metadata", async () => {
    mockAdminFetch({
      ok: true,
      json: async () => ({
        public_id: "rinana/videos/clip",
        secure_url: "https://res.cloudinary.com/demo/video/upload/v1/clip.mp4",
        status: "active"
      })
    });

    const response = await POST(
      new Request("http://localhost/api/cloudinary/video-metadata", {
        body: JSON.stringify({ publicId: "rinana/videos/clip" }),
        headers: { Authorization: "Bearer admin-token" },
        method: "POST"
      })
    );

    await expect(response.json()).resolves.toMatchObject({
      playbackUrl: "https://res.cloudinary.com/demo/video/upload/v1/clip.mp4",
      processingState: "ready",
      publicId: "rinana/videos/clip"
    });
    expect(response.status).toBe(200);
  });

  it("requires a public id", async () => {
    mockAdminFetch({
      ok: true,
      json: async () => ({
        public_id: "rinana/videos/clip",
        secure_url: "https://res.cloudinary.com/demo/video/upload/v1/clip.mp4",
        status: "active"
      })
    });

    const response = await POST(
      new Request("http://localhost/api/cloudinary/video-metadata", {
        body: JSON.stringify({}),
        headers: { Authorization: "Bearer admin-token" },
        method: "POST"
      })
    );

    expect(response.status).toBe(400);
  });
});
