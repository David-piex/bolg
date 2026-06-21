import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginView } from "@/components/LoginView";
import { getDictionary } from "@/i18n/dictionaries";
import { AppStateProvider } from "@/state/AppStateProvider";

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "zh" }),
  useRouter: () => ({ push: pushMock, replace: replaceMock })
}));

describe("LoginView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
    replaceMock.mockReset();
    window.localStorage.clear();
  });

  it("starts with a password login form in Chinese", () => {
    render(
      <AppStateProvider>
        <LoginView dictionary={getDictionary("zh")} />
      </AppStateProvider>
    );

    expect(screen.getByText("登录账号")).toBeInTheDocument();
    expect(screen.getByLabelText("邮箱")).toBeInTheDocument();
    expect(screen.getByLabelText("密码")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登录" })).toBeInTheDocument();
    expect(screen.queryByLabelText("邀请码")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("昵称")).not.toBeInTheDocument();
    expect(screen.queryByText("切换演示身份")).not.toBeInTheDocument();
  });

  it("shows invite registration fields only after choosing invite registration", () => {
    render(
      <AppStateProvider>
        <LoginView dictionary={getDictionary("zh")} />
      </AppStateProvider>
    );

    fireEvent.click(screen.getByRole("tab", { name: "邀请码注册" }));

    expect(screen.getByRole("heading", { name: "邀请码注册" })).toBeInTheDocument();
    expect(screen.getByLabelText("邀请码")).toBeInTheDocument();
    expect(screen.getByLabelText("昵称")).toBeInTheDocument();
    expect(screen.getByLabelText("邮箱")).toBeInTheDocument();
    expect(screen.getByLabelText("密码")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "注册" })).toBeInTheDocument();
  });

  it("routes users back to the home page after password login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          displayName: "Admin",
          email: "admin@example.com",
          id: "admin-1",
          memberLevel: "DIAMOND",
          role: "ADMIN",
          username: "admin"
        })
      })) as unknown as typeof fetch
    );

    render(
      <AppStateProvider>
        <LoginView dictionary={getDictionary("zh")} />
      </AppStateProvider>
    );

    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret-password" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/zh");
    });
  });
});
