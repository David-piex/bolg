import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoginView } from "@/components/LoginView";
import { getDictionary } from "@/i18n/dictionaries";
import { AppStateProvider } from "@/state/AppStateProvider";

describe("LoginView", () => {
  it("renders password login and invite registration controls in Chinese", () => {
    render(
      <AppStateProvider>
        <LoginView dictionary={getDictionary("zh")} />
      </AppStateProvider>
    );

    expect(screen.getByText("密码")).toBeInTheDocument();
    expect(screen.getByText("邀请码")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "注册" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登录" })).toBeInTheDocument();
  });
});
