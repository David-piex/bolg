export type MembershipLevel = "public" | "normal" | "gold" | "diamond";

export type Viewer = {
  level: Exclude<MembershipLevel, "public">;
  disabled: boolean;
  isAdmin: boolean;
} | null;

export const visibilityRank: Record<MembershipLevel, number> = {
  public: 0,
  normal: 1,
  gold: 2,
  diamond: 3
};

export function viewerRank(viewer: Viewer): number {
  if (!viewer || viewer.disabled) {
    return visibilityRank.public;
  }

  if (viewer.isAdmin) {
    return visibilityRank.diamond;
  }

  return visibilityRank[viewer.level];
}

export function canViewContent(viewer: Viewer, requiredLevel: MembershipLevel): boolean {
  if (requiredLevel === "public") {
    return true;
  }

  return viewerRank(viewer) >= visibilityRank[requiredLevel];
}

export function canManage(viewer: Viewer): boolean {
  return Boolean(viewer && viewer.isAdmin && !viewer.disabled);
}

export function labelForLevel(level: MembershipLevel): string {
  return level;
}
