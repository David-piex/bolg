import type { InviteTargetLevel } from "@/domain/invites";
import { JavaApiError, getMe, login, logout, register, type JavaMemberLevel, type JavaRole, type JavaUser } from "@/services/java-api-client";

export type ClientRegisterInput = {
  displayName: string;
  email: string;
  inviteCode: string;
  password: string;
};

export type ClientRegisteredUser = {
  email: string;
  level: InviteTargetLevel;
  userId: string;
};

export type ClientLoginInput = {
  email: string;
  password: string;
};

export type ClientProfile = {
  disabled: boolean;
  displayName: string;
  email: string;
  isAdmin: boolean;
  level: InviteTargetLevel;
  userId: string;
};

export type ClientLoginSession = {
  accessToken: string;
  expiresIn: number;
  profile: ClientProfile;
  refreshToken: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(body.error || "Authentication request failed");
  }

  return body;
}

function fromJavaLevel(level: JavaMemberLevel): InviteTargetLevel {
  return level.toLowerCase() as InviteTargetLevel;
}

function isAdminRole(role: JavaRole): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

function usernameFromDisplayNameOrEmail(displayName: string, email: string): string {
  const value = displayName.trim() || email.split("@")[0] || "user";
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 64);
}

function sessionFromJavaUser(user: JavaUser): ClientLoginSession {
  return {
    accessToken: "cookie-session",
    expiresIn: 900,
    profile: {
      disabled: false,
      displayName: user.displayName,
      email: user.email,
      isAdmin: isAdminRole(user.role),
      level: fromJavaLevel(user.memberLevel),
      userId: user.id
    },
    refreshToken: "cookie-session"
  };
}

export async function registerWithInviteClient(input: ClientRegisterInput): Promise<ClientRegisteredUser> {
  const user = await register({
    email: input.email,
    inviteCode: input.inviteCode,
    password: input.password,
    username: usernameFromDisplayNameOrEmail(input.displayName, input.email)
  });

  return {
    email: user.email,
    level: fromJavaLevel(user.memberLevel),
    userId: user.id
  };
}

export async function loginWithPasswordClient(input: ClientLoginInput): Promise<ClientLoginSession> {
  const user = await login({
    account: input.email,
    password: input.password
  });

  return sessionFromJavaUser(user);
}

export async function getCurrentSessionClient(): Promise<ClientLoginSession | null> {
  try {
    return sessionFromJavaUser(await getMe());
  } catch (error) {
    if (error instanceof JavaApiError) {
      if (error.status === 401 || error.status === 403) {
        return null;
      }

      throw error;
    }

    throw error;
  }
}

export async function logoutClient(): Promise<void> {
  await logout();
}
