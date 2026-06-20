import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRemoteInvite,
  deleteRemoteInvite,
  fetchRemoteAdminDataset,
  updateRemoteUser
} from "@/services/admin-client";

describe("admin client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads admin users and invite codes", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path.endsWith("/users?page=0&size=10")) {
        return {
          ok: true,
          json: async () => ({
            page: 0,
            size: 10,
            total: 1,
            totalPages: 1,
            users: [{
              displayName: "Admin",
              email: "admin@example.com",
              id: "admin-1",
              memberLevel: "DIAMOND",
              role: "SUPER_ADMIN",
              status: "ACTIVE",
              username: "admin"
            }]
          })
        };
      }

      return {
        ok: true,
        json: async () => [{
          code: "GOLD-2026",
          id: "invite-1",
          initialLevel: "GOLD",
          maxUses: 1,
          status: "ACTIVE",
          usedCount: 0
        }]
      };
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(fetchRemoteAdminDataset("admin-token")).resolves.toMatchObject({
      invites: [{ code: "GOLD-2026" }],
      userPage: { page: 0, size: 10, total: 1, totalPages: 1 },
      users: [{ id: "admin-1", isAdmin: true, level: "diamond", name: "Admin" }]
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/users?page=0&size=10", {
      credentials: "include",
      headers: expect.any(Headers),
      method: "GET"
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/invites", expect.objectContaining({
      credentials: "include",
      method: "GET"
    }));
  });

  it("creates invite codes remotely", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        code: "DIAMOND-ABC123",
        id: "invite-2",
        initialLevel: "DIAMOND",
        maxUses: 1,
        status: "ACTIVE",
        usedCount: 0
      })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(createRemoteInvite("admin-token", "diamond")).resolves.toMatchObject({
      code: "DIAMOND-ABC123",
      targetLevel: "diamond"
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/invites", {
      body: expect.stringContaining("\"initialLevel\":\"DIAMOND\""),
      credentials: "include",
      headers: expect.any(Headers),
      method: "POST"
    });
  });

  it("updates users remotely", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        disabled: true,
        displayName: "User",
        email: "user@example.com",
        id: "user-1",
        memberLevel: "GOLD",
        role: "USER",
        status: "DISABLED",
        username: "user"
      })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await updateRemoteUser("admin-token", { disabled: true, level: "gold", userId: "user-1" });

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/users/user-1", {
      body: JSON.stringify({
        disabled: true,
        memberLevel: "GOLD"
      }),
      credentials: "include",
      headers: expect.any(Headers),
      method: "PATCH"
    });
  });

  it("deletes invite codes remotely", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await deleteRemoteInvite("admin-token", "invite-1");

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/invites/invite-1", {
      credentials: "include",
      headers: expect.any(Headers),
      method: "DELETE"
    });
  });
});
