import type { InviteTargetLevel } from "@/domain/invites";
import type { JavaMemberLevel, JavaRole, JavaUserStatus } from "@/services/java-api-client";

export type AccountProfile = {
  avatarUrl: string | null;
  disabled: boolean;
  displayName: string;
  email: string;
  id: string;
  isAdmin: boolean;
  level: InviteTargetLevel;
  username: string;
};

export type ChangePasswordInput = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ChangeEmailInput = {
  oldPassword: string;
  newEmail: string;
  confirmEmail: string;
};

type JavaAccountProfile = {
  avatarUrl: string | null;
  displayName: string;
  email: string;
  id: string;
  memberLevel: JavaMemberLevel;
  role: JavaRole;
  status: JavaUserStatus;
  username: string;
};

const avatarLimitBytes = 10 * 1024 * 1024;
const supportedAvatarTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function getAccountProfile(): Promise<AccountProfile> {
  return toAccountProfile(await request<JavaAccountProfile>("/api/account/profile", { method: "GET" }));
}

export async function changeAccountPassword(input: ChangePasswordInput): Promise<AccountProfile> {
  return toAccountProfile(await request<JavaAccountProfile>("/api/account/password", {
    body: JSON.stringify(input),
    method: "PATCH"
  }));
}

export async function changeAccountEmail(input: ChangeEmailInput): Promise<AccountProfile> {
  return toAccountProfile(await request<JavaAccountProfile>("/api/account/email", {
    body: JSON.stringify(input),
    method: "PATCH"
  }));
}

export async function uploadAccountAvatar(file: File): Promise<AccountProfile> {
  const validationError = validateAvatarFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const formData = new FormData();
  formData.append("file", file);
  return toAccountProfile(await request<JavaAccountProfile>("/api/account/avatar", {
    body: formData,
    method: "POST"
  }));
}

export function validateAvatarFile(file: File): string | null {
  if (!supportedAvatarTypes.has(file.type)) {
    return "头像只支持 JPG、PNG、WebP 或 GIF。";
  }

  if (file.size > avatarLimitBytes) {
    return "头像不能超过 10MB。";
  }

  return null;
}

function toAccountProfile(user: JavaAccountProfile): AccountProfile {
  return {
    avatarUrl: user.avatarUrl,
    disabled: user.status === "DISABLED",
    displayName: user.displayName,
    email: user.email,
    id: user.id,
    isAdmin: user.role === "ADMIN" || user.role === "SUPER_ADMIN",
    level: user.memberLevel.toLowerCase() as InviteTargetLevel,
    username: user.username
  };
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorBody = body as { message?: string };
    throw new Error(errorBody.message || "账号请求失败，请稍后重试。");
  }

  return body as T;
}
