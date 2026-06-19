import { describe, expect, it } from "vitest";
import { consumeInviteCode } from "@/domain/invites";

describe("invite codes", () => {
  const invites = [
    {
      id: "invite-1",
      code: "GOLD-2026",
      targetLevel: "gold" as const,
      usedByUserId: null,
      note: "Gold member"
    },
    {
      id: "invite-2",
      code: "USED-2026",
      targetLevel: "diamond" as const,
      usedByUserId: "user-existing",
      note: "Already consumed"
    }
  ];

  it("consumes a valid one-time invite and assigns its preset level", () => {
    const result = consumeInviteCode(invites, "GOLD-2026", "user-new");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.assignedLevel).toBe("gold");
      expect(result.invites.find((invite) => invite.code === "GOLD-2026")?.usedByUserId).toBe("user-new");
    }
  });

  it("rejects a used invite", () => {
    const result = consumeInviteCode(invites, "USED-2026", "user-new");

    expect(result).toEqual({
      ok: false,
      reason: "used"
    });
  });

  it("rejects a missing invite", () => {
    const result = consumeInviteCode(invites, "MISSING", "user-new");

    expect(result).toEqual({
      ok: false,
      reason: "missing"
    });
  });

  it("does not mutate the original invite list", () => {
    consumeInviteCode(invites, "GOLD-2026", "user-new");

    expect(invites.find((invite) => invite.code === "GOLD-2026")?.usedByUserId).toBeNull();
  });
});
