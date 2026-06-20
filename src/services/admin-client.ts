import type { InviteCode, InviteTargetLevel } from "@/domain/invites";
import type { UserProfile } from "@/data/mock-data";
import {
  createInvite,
  deleteInvite,
  listAdminUsers,
  listInvites,
  updateUser,
  type JavaAdminUser,
  type JavaInvite,
  type JavaMemberLevel,
  type JavaRole,
  type JavaUserStatus
} from "@/services/java-api-client";

type ErrorBody = {
  error?: string;
};

function errorMessageFromBody(body: unknown): string | undefined {
  if (body && typeof body === "object" && "error" in body) {
    const message = (body as ErrorBody).error;
    return typeof message === "string" ? message : undefined;
  }

  return undefined;
}

export type AdminDataset = {
  invites: InviteCode[];
  users: UserProfile[];
};

export type UpdateRemoteUserInput = {
  disabled?: boolean;
  level?: InviteTargetLevel;
  userId: string;
};

function toJavaLevel(level: InviteTargetLevel): JavaMemberLevel {
  return level.toUpperCase() as JavaMemberLevel;
}

function fromJavaLevel(level: JavaMemberLevel): InviteTargetLevel {
  return level.toLowerCase() as InviteTargetLevel;
}

function inviteFromJava(invite: JavaInvite): InviteCode {
  return {
    code: invite.code,
    id: invite.id,
    note: invite.status === "DISABLED" ? "disabled" : undefined,
    targetLevel: fromJavaLevel(invite.initialLevel),
    usedByUserId: invite.usedCount > 0 ? "used" : null
  };
}

function isAdminRole(role: JavaRole): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

function userFromJava(user: JavaAdminUser): UserProfile {
  return {
    disabled: user.status === "DISABLED",
    email: user.email,
    id: user.id,
    isAdmin: isAdminRole(user.role),
    level: fromJavaLevel(user.memberLevel),
    name: user.displayName || user.username || user.email
  };
}

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T | ErrorBody;

  if (!response.ok) {
    throw new Error(errorMessageFromBody(body) || fallback);
  }

  return body as T;
}

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`
  };
}

function jsonAuthHeaders(accessToken: string) {
  return {
    ...authHeaders(accessToken),
    "Content-Type": "application/json"
  };
}

export async function fetchRemoteAdminDataset(accessToken: string): Promise<AdminDataset> {
  const [invites, users] = await Promise.all([listInvites(), listAdminUsers()]);
  return {
    invites: invites.map(inviteFromJava),
    users: users.map(userFromJava)
  };
}

export async function createRemoteInvite(
  accessToken: string,
  level: InviteTargetLevel
): Promise<InviteCode> {
  const invite = await createInvite({
    code: `${level.toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    initialLevel: toJavaLevel(level),
    maxUses: 1
  });

  return inviteFromJava(invite);
}

export async function updateRemoteUser(accessToken: string, input: UpdateRemoteUserInput): Promise<void> {
  await updateUser({
    disabled: Boolean(input.disabled),
    memberLevel: toJavaLevel(input.level ?? "normal"),
    userId: input.userId
  });
}

export async function deleteRemoteInvite(accessToken: string, inviteId: string): Promise<void> {
  await deleteInvite(inviteId);
}
