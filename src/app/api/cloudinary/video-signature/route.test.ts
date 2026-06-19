import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/cloudinary/video-signature/route";

const originalEnv = { ...process.env };

function mockAdminFetch() {
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
      }) as unknown as typeof fetch
  );
}

describe("POST /api/cloudinary/video-signature", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    process.env.CLOUDINARY_CLOUD_NAME = "demo-cloud";
    process.env.CLOUDINARY_API_KEY = "api-key";
    process.env.CLOUDINARY_API_SECRET = "api-secret";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  });

  it("requires an admin bearer token before creating video upload signatures", async () => {
    const response = await POST(
      new Request("http://localhost/api/cloudinary/video-signature", {
        body: JSON.stringify({
          collectionId: "collection-1",
          fileName: "Trailer.mp4",
          visibility: "gold"
        }),
        method: "POST"
      })
    );

    expect(response.status).toBe(401);
  });

  it("returns a signed upload payload", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_781_000_000_000);
    mockAdminFetch();

    const response = await POST(
      new Request("http://localhost/api/cloudinary/video-signature", {
        body: JSON.stringify({
          collectionId: "collection-1",
          fileName: "Trailer.mp4",
          visibility: "gold"
        }),
        headers: { Authorization: "Bearer admin-token" },
        method: "POST"
      })
    );

    await expect(response.json()).resolves.toMatchObject({
      apiKey: "api-key",
      cloudName: "demo-cloud",
      publicId: "collection-1/trailer",
      timestamp: 1_781_000_000,
      uploadUrl: "https://api.cloudinary.com/v1_1/demo-cloud/video/upload"
    });
    expect(response.status).toBe(200);
  });

  it("rejects invalid visibility", async () => {
    mockAdminFetch();

    const response = await POST(
      new Request("http://localhost/api/cloudinary/video-signature", {
        body: JSON.stringify({
          collectionId: "collection-1",
          fileName: "Trailer.mp4",
          visibility: "public"
        }),
        headers: { Authorization: "Bearer admin-token" },
        method: "POST"
      })
    );

    expect(response.status).toBe(400);
  });
});
