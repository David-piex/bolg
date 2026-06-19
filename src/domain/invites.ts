import type { MembershipLevel } from "@/domain/membership";

export type InviteTargetLevel = Exclude<MembershipLevel, "public">;

export type InviteCode = {
  id: string;
  code: string;
  targetLevel: InviteTargetLevel;
  usedByUserId: string | null;
  note?: string;
};

export type ConsumeInviteResult =
  | {
      ok: true;
      assignedLevel: InviteTargetLevel;
      invite: InviteCode;
      invites: InviteCode[];
    }
  | {
      ok: false;
      reason: "missing" | "used";
    };

export function consumeInviteCode(
  invites: InviteCode[],
  code: string,
  userId: string
): ConsumeInviteResult {
  const invite = invites.find((candidate) => candidate.code === code);

  if (!invite) {
    return { ok: false, reason: "missing" };
  }

  if (invite.usedByUserId) {
    return { ok: false, reason: "used" };
  }

  const consumedInvite = {
    ...invite,
    usedByUserId: userId
  };

  return {
    ok: true,
    assignedLevel: invite.targetLevel,
    invite: consumedInvite,
    invites: invites.map((candidate) => (candidate.id === invite.id ? consumedInvite : candidate))
  };
}
