import type { InviteCode, InviteTargetLevel } from "@/domain/invites";
import type { UserProfile } from "@/data/mock-data";
import {
  createInvite,
  deleteInvite,
  listAdminUsers,
  listInvites,
  updateUser,
  type JavaAdminUser,
  type JavaAdminUserPage,
  type JavaInvite,
  type JavaMemberLevel,
  type JavaRole,
  type JavaUserStatus
} from "@/services/java-api-client";

export type AdminDataset = {
  invites: InviteCode[];
  userPage: AdminUserPage;
  users: UserProfile[];
};

export type AdminUserPage = {
  page: number;
  size: number;
  total: number;
  totalPages: number;
  users: UserProfile[];
};

export type FetchAdminUsersInput = {
  page?: number;
  q?: string;
  size?: number;
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
    expiresAt: invite.expiresAt ?? null,
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

function userPageFromJava(page: JavaAdminUserPage): AdminUserPage {
  return {
    page: page.page,
    size: page.size,
    total: page.total,
    totalPages: page.totalPages,
    users: page.users.map(userFromJava)
  };
}

export async function fetchRemoteAdminUsers(
  accessToken: string,
  input: FetchAdminUsersInput = {}
): Promise<AdminUserPage> {
  return userPageFromJava(await listAdminUsers(input));
}

export async function fetchRemoteAdminDataset(accessToken: string): Promise<AdminDataset> {
  const [invites, userPage] = await Promise.all([listInvites(), fetchRemoteAdminUsers(accessToken, { page: 0, size: 10 })]);
  return {
    invites: invites.map(inviteFromJava),
    userPage,
    users: userPage.users
  };
}

export async function createRemoteInvite(
  accessToken: string,
  level: InviteTargetLevel,
  expiresAt?: string | null
): Promise<InviteCode> {
  const invite = await createInvite({
    code: `${level.toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    expiresAt,
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
