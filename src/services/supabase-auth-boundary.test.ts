import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginWithPassword, registerWithInvite } from "@/services/supabase-auth-boundary";

const originalEnv = { ...process.env };

describe("supabase auth boundary", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  });

  it("registers a user only after verifying an unused invite code", async () => {
    const fetchMock = vi
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
      });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(
      registerWithInvite({
        displayName: "New User",
        email: "new@example.com",
        inviteCode: "GOLD-2026",
        password: "secret-password"
      })
    ).resolves.toEqual({
      email: "new@example.com",
      level: "gold",
      userId: "user-1"
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://project.supabase.co/rest/v1/invite_codes?code=eq.GOLD-2026&select=id,target_level,used_by_user_id",
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: "service-role",
          Authorization: "Bearer service-role"
        })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://project.supabase.co/auth/v1/admin/users",
      expect.objectContaining({
        body: JSON.stringify({
          email: "new@example.com",
          email_confirm: true,
          password: "secret-password",
          user_metadata: { display_name: "New User" }
        }),
        method: "POST"
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://project.supabase.co/rest/v1/rpc/consume_invite_for_user",
      expect.objectContaining({
        body: JSON.stringify({
          invite_code: "GOLD-2026",
          profile_display_name: "New User",
          profile_email: "new@example.com",
          profile_user_id: "user-1"
        }),
        method: "POST"
      })
    );
  });

  it("rejects missing invite codes before creating an auth user", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(
      registerWithInvite({
        displayName: "New User",
        email: "new@example.com",
        inviteCode: "MISSING",
        password: "secret-password"
      })
    ).rejects.toThrow("Invite code is invalid");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("logs in with Supabase password auth and loads the profile", async () => {
    const fetchMock = vi
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
            level: "diamond"
          }
        ]
      });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(
      loginWithPassword({
        email: "member@example.com",
        password: "secret-password"
      })
    ).resolves.toEqual({
      accessToken: "access-token",
      expiresIn: 3600,
      profile: {
        disabled: false,
        displayName: "Member",
        email: "member@example.com",
        isAdmin: false,
        level: "diamond",
        userId: "user-1"
      },
      refreshToken: "refresh-token"
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://project.supabase.co/auth/v1/token?grant_type=password",
      expect.objectContaining({
        body: JSON.stringify({ email: "member@example.com", password: "secret-password" }),
        headers: expect.objectContaining({
          apikey: "anon-key"
        }),
        method: "POST"
      })
    );
  });
});
