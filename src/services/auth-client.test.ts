import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentSessionClient, loginWithPasswordClient, registerWithInviteClient } from "@/services/auth-client";

describe("auth client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("registers through the Java auth API without exposing service credentials", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        displayName: "New User",
        email: "new@example.com",
        id: "user-1",
        memberLevel: "GOLD",
        role: "USER",
        username: "new"
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
          email: "new@example.com",
          inviteCode: "GOLD-2026",
          password: "secret-password",
          username: "new-user"
        }),
        credentials: "include",
        headers: expect.any(Headers),
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
          displayName: "Member",
          email: "member@example.com",
          id: "user-1",
          memberLevel: "DIAMOND",
          role: "USER",
          username: "member"
        })
      })) as unknown as typeof fetch
    );

    await expect(
      loginWithPasswordClient({
        email: "member@example.com",
        password: "secret-password"
      })
    ).resolves.toMatchObject({
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
        json: async () => ({ errorCode: "INVALID_INVITE_CODE", message: "Invite code is invalid" })
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

  it("treats unauthenticated session lookup failures as logged out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ errorCode: "UNAUTHENTICATED", message: "Please sign in" }),
        status: 401
      })) as unknown as typeof fetch
    );

    await expect(getCurrentSessionClient()).resolves.toBeNull();
  });

  it("surfaces transient auth session lookup failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ errorCode: "SERVER_ERROR", message: "Temporary failure" }),
        status: 500
      })) as unknown as typeof fetch
    );

    await expect(getCurrentSessionClient()).rejects.toMatchObject({
      errorCode: "SERVER_ERROR",
      message: "Temporary failure",
      status: 500
    });
  });
});
