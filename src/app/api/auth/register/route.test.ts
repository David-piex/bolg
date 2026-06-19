import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/register/route";

const originalEnv = { ...process.env };

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  });

  it("registers with an invite code through the server boundary", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "invite-1", target_level: "gold", used_by_user_id: null }]
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "user-1", email: "new@example.com" })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ level: "gold" }]
        }) as unknown as typeof fetch
    );

    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        body: JSON.stringify({
          displayName: "New User",
          email: "new@example.com",
          inviteCode: "GOLD-2026",
          password: "secret-password"
        }),
        method: "POST"
      })
    );

    await expect(response.json()).resolves.toEqual({
      email: "new@example.com",
      level: "gold",
      userId: "user-1"
    });
    expect(response.status).toBe(200);
  });

  it("rejects incomplete registration payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        body: JSON.stringify({
          email: "new@example.com",
          inviteCode: "GOLD-2026"
        }),
        method: "POST"
      })
    );

    expect(response.status).toBe(400);
  });
});
