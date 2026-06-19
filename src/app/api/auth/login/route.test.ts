import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/login/route";

const originalEnv = { ...process.env };

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  });

  it("logs in and returns a profile-backed session", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: "access-token",
            expires_in: 3600,
            refresh_token: "refresh-token",
            user: { id: "user-1", email: "member@example.com" }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              disabled: false,
              display_name: "Member",
              email: "member@example.com",
              id: "user-1",
              is_admin: false,
              level: "gold"
            }
          ]
        }) as unknown as typeof fetch
    );

    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        body: JSON.stringify({
          email: "member@example.com",
          password: "secret-password"
        }),
        method: "POST"
      })
    );

    await expect(response.json()).resolves.toMatchObject({
      accessToken: "access-token",
      profile: {
        displayName: "Member",
        level: "gold",
        userId: "user-1"
      },
      refreshToken: "refresh-token"
    });
    expect(response.status).toBe(200);
  });

  it("rejects incomplete login payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        body: JSON.stringify({ email: "member@example.com" }),
        method: "POST"
      })
    );

    expect(response.status).toBe(400);
  });
});
