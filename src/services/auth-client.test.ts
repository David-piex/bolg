import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginWithPasswordClient, registerWithInviteClient } from "@/services/auth-client";

describe("auth client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("registers through the local auth API without exposing Supabase service credentials", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        email: "new@example.com",
        level: "gold",
        userId: "user-1"
      })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(
      registerWithInviteClient({
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

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/register",
      expect.objectContaining({
        body: JSON.stringify({
          displayName: "New User",
          email: "new@example.com",
          inviteCode: "GOLD-2026",
          password: "secret-password"
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      })
    );
  });

  it("logs in through the local auth API and returns the session token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
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
        })
      })) as unknown as typeof fetch
    );

    await expect(
      loginWithPasswordClient({
        email: "member@example.com",
        password: "secret-password"
      })
    ).resolves.toMatchObject({
      accessToken: "access-token",
      profile: {
        displayName: "Member",
        level: "diamond",
        userId: "user-1"
      }
    });
  });

  it("surfaces auth API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: "Invite code is invalid" })
      })) as unknown as typeof fetch
    );

    await expect(
      registerWithInviteClient({
        displayName: "New User",
        email: "new@example.com",
        inviteCode: "BAD",
        password: "secret-password"
      })
    ).rejects.toThrow("Invite code is invalid");
  });
});
