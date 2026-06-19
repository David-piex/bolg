import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/supabase/image-upload/route";

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

describe("POST /api/supabase/image-upload", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  });

  it("requires an admin bearer token before creating signed image uploads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ signedURL: "/storage/v1/object/upload/sign/images/gold/cover.webp?token=abc" })
      })) as unknown as typeof fetch
    );

    const response = await POST(
      new Request("http://localhost/api/supabase/image-upload", {
        body: JSON.stringify({
          contentType: "image/webp",
          fileName: "Cover.webp",
          visibility: "gold"
        }),
        method: "POST"
      })
    );

    expect(response.status).toBe(401);
  });

  it("returns a signed Supabase image upload URL", async () => {
    mockAdminFetch({
      ok: true,
      json: async () => ({ signedURL: "/storage/v1/object/upload/sign/images/gold/cover.webp?token=abc" })
    });

    const response = await POST(
      new Request("http://localhost/api/supabase/image-upload", {
        body: JSON.stringify({
          contentType: "image/webp",
          fileName: "Cover.webp",
          visibility: "gold"
        }),
        headers: { Authorization: "Bearer admin-token" },
        method: "POST"
      })
    );

    await expect(response.json()).resolves.toEqual({
      path: "gold/cover.webp",
      token: "abc",
      uploadUrl: "https://project.supabase.co/storage/v1/object/upload/sign/images/gold/cover.webp?token=abc"
    });
    expect(response.status).toBe(200);
  });

  it("rejects non-image content types", async () => {
    mockAdminFetch({
      ok: true,
      json: async () => ({ signedURL: "/storage/v1/object/upload/sign/images/gold/clip.mp4?token=abc" })
    });

    const response = await POST(
      new Request("http://localhost/api/supabase/image-upload", {
        body: JSON.stringify({
          contentType: "video/mp4",
          fileName: "clip.mp4",
          visibility: "gold"
        }),
        headers: { Authorization: "Bearer admin-token" },
        method: "POST"
      })
    );

    expect(response.status).toBe(400);
  });
});
