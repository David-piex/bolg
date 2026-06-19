import type { InviteTargetLevel } from "@/domain/invites";

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

export async function registerWithInviteClient(input: ClientRegisterInput): Promise<ClientRegisteredUser> {
  const response = await fetch("/api/auth/register", {
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });

  return readJson<ClientRegisteredUser>(response);
}

export async function loginWithPasswordClient(input: ClientLoginInput): Promise<ClientLoginSession> {
  const response = await fetch("/api/auth/login", {
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });

  return readJson<ClientLoginSession>(response);
}
