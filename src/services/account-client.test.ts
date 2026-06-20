import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  changeAccountEmail,
  changeAccountPassword,
  getAccountProfile,
  uploadAccountAvatar
} from "@/services/account-client";

describe("account client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the current account profile through the Java account API", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        avatarUrl: "/api/account/avatar",
        displayName: "Member",
        email: "member@example.com",
        id: "user-1",
        memberLevel: "GOLD",
        role: "USER",
        status: "ACTIVE",
        username: "member"
      })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(getAccountProfile()).resolves.toMatchObject({
      avatarUrl: "/api/account/avatar",
      email: "member@example.com",
      level: "gold"
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/account/profile", {
      credentials: "include",
      headers: expect.any(Headers),
      method: "GET"
    });
  });

  it("changes password with old password and confirmation", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        avatarUrl: null,
        displayName: "Member",
        email: "member@example.com",
        id: "user-1",
        memberLevel: "NORMAL",
        role: "USER",
        status: "ACTIVE",
        username: "member"
      })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await changeAccountPassword({
      confirmPassword: "new-password-123",
      newPassword: "new-password-123",
      oldPassword: "password123"
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/account/password", {
      body: JSON.stringify({
        confirmPassword: "new-password-123",
        newPassword: "new-password-123",
        oldPassword: "password123"
      }),
      credentials: "include",
      headers: expect.any(Headers),
      method: "PATCH"
    });
  });

  it("changes email with old password and confirmation", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        avatarUrl: null,
        displayName: "Member",
        email: "next@example.com",
        id: "user-1",
        memberLevel: "NORMAL",
        role: "USER",
        status: "ACTIVE",
        username: "member"
      })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(
      changeAccountEmail({
        confirmEmail: "next@example.com",
        newEmail: "next@example.com",
        oldPassword: "password123"
      })
    ).resolves.toMatchObject({ email: "next@example.com" });
  });

  it("rejects avatar files larger than 10MB before upload", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
    const file = new File([new Uint8Array((10 * 1024 * 1024) + 1)], "avatar.png", { type: "image/png" });

    await expect(uploadAccountAvatar(file)).rejects.toThrow("头像不能超过 10MB");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uploads avatar files with form data", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        avatarUrl: "/api/account/avatar",
        displayName: "Member",
        email: "member@example.com",
        id: "user-1",
        memberLevel: "NORMAL",
        role: "USER",
        status: "ACTIVE",
        username: "member"
      })
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
    const file = new File(["avatar"], "avatar.webp", { type: "image/webp" });

    await expect(uploadAccountAvatar(file)).resolves.toMatchObject({ avatarUrl: "/api/account/avatar" });
    expect(fetchMock).toHaveBeenCalledWith("/api/account/avatar", {
      body: expect.any(FormData),
      credentials: "include",
      headers: expect.any(Headers),
      method: "POST"
    });
  });
});
