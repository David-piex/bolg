import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountSettingsView } from "@/components/AccountSettingsView";
import { getDictionary } from "@/i18n/dictionaries";
import { AppStateProvider, useAppState } from "@/state/AppStateProvider";

vi.mock("@/services/account-client", () => ({
  changeAccountEmail: vi.fn(),
  changeAccountPassword: vi.fn(),
  getAccountProfile: vi.fn(),
  uploadAccountAvatar: vi.fn()
}));

const { changeAccountEmail, changeAccountPassword, getAccountProfile, uploadAccountAvatar } = await import(
  "@/services/account-client"
);

function RemoteLoginProbe() {
  const { loginWithPassword } = useAppState();

  return (
    <button type="button" onClick={() => void loginWithPassword({ email: "member@example.com", password: "password123" })}>
      login
    </button>
  );
}

function mockLoginFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/auth/me") {
        return {
          ok: false,
          status: 401,
          json: async () => ({ errorCode: "UNAUTHENTICATED", message: "请先登录" })
        };
      }

      return {
        ok: true,
        json: async () => ({
          displayName: "Member",
          email: "member@example.com",
          id: "user-1",
          memberLevel: "GOLD",
          role: "USER",
          username: "member"
        })
      };
    }) as unknown as typeof fetch
  );
}

function profile(overrides: Partial<Awaited<ReturnType<typeof getAccountProfile>>> = {}) {
  return {
    avatarUrl: "/api/account/avatar",
    disabled: false,
    displayName: "Member",
    email: "member@example.com",
    id: "user-1",
    isAdmin: false,
    level: "gold",
    username: "member",
    ...overrides
  } as Awaited<ReturnType<typeof getAccountProfile>>;
}

describe("AccountSettingsView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    mockLoginFetch();
    vi.mocked(getAccountProfile).mockResolvedValue(profile());
    vi.mocked(changeAccountPassword).mockResolvedValue(profile());
    vi.mocked(changeAccountEmail).mockResolvedValue(profile({ email: "next@example.com" }));
    vi.mocked(uploadAccountAvatar).mockResolvedValue(profile({ avatarUrl: "/api/account/avatar?updated=1" }));
  });

  it("shows one Chinese account settings area after login", async () => {
    render(
      <AppStateProvider>
        <RemoteLoginProbe />
        <AccountSettingsView dictionary={getDictionary("zh")} />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("请先登录后再管理账号。")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "login" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "账号设置" })).toBeInTheDocument();
    });
    expect(screen.getByText("member@example.com")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "头像" })).toHaveAttribute("src", "/api/account/avatar");
    });
    expect(screen.getByText("修改密码")).toBeInTheDocument();
    expect(screen.getByText("修改邮箱")).toBeInTheDocument();
    expect(screen.getByText("更换头像")).toBeInTheDocument();
  });

  it("submits password changes with old password and confirmation", async () => {
    render(
      <AppStateProvider>
        <RemoteLoginProbe />
        <AccountSettingsView dictionary={getDictionary("zh")} />
      </AppStateProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "login" }));

    await waitFor(() => screen.getByLabelText("原密码"));
    fireEvent.change(screen.getByLabelText("原密码"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("新密码"), { target: { value: "new-password-123" } });
    fireEvent.change(screen.getByLabelText("确认新密码"), { target: { value: "new-password-123" } });
    fireEvent.click(screen.getByRole("button", { name: "保存密码" }));

    await waitFor(() => {
      expect(changeAccountPassword).toHaveBeenCalledWith({
        confirmPassword: "new-password-123",
        newPassword: "new-password-123",
        oldPassword: "password123"
      });
    });
    expect(screen.getByText("密码已更新。")).toBeInTheDocument();
  });

  it("submits email changes with old password and confirmation", async () => {
    render(
      <AppStateProvider>
        <RemoteLoginProbe />
        <AccountSettingsView dictionary={getDictionary("zh")} />
      </AppStateProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "login" }));

    await waitFor(() => screen.getByLabelText("新邮箱"));
    fireEvent.change(screen.getByLabelText("邮箱确认密码"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("新邮箱"), { target: { value: "next@example.com" } });
    fireEvent.change(screen.getByLabelText("确认新邮箱"), { target: { value: "next@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "保存邮箱" }));

    await waitFor(() => {
      expect(changeAccountEmail).toHaveBeenCalledWith({
        confirmEmail: "next@example.com",
        newEmail: "next@example.com",
        oldPassword: "password123"
      });
    });
    expect(screen.getByText("邮箱已更新。")).toBeInTheDocument();
  });

  it("uploads avatar files through the account API", async () => {
    render(
      <AppStateProvider>
        <RemoteLoginProbe />
        <AccountSettingsView dictionary={getDictionary("zh")} />
      </AppStateProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "login" }));

    await waitFor(() => screen.getByLabelText("上传头像"));
    const file = new File(["avatar"], "avatar.webp", { type: "image/webp" });
    fireEvent.change(screen.getByLabelText("上传头像"), { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadAccountAvatar).toHaveBeenCalledWith(file);
    });
    expect(screen.getByText("头像已更新。")).toBeInTheDocument();
  });
});
