import { canViewContent, type MembershipLevel, type Viewer } from "@/domain/membership";

export type VisibilityCollection = {
  id: string;
  defaultVisibility: MembershipLevel;
};

export type VisibilityItem = {
  id: string;
  collectionId?: string;
  title: string;
  visibilityOverride: MembershipLevel | null;
};

export function resolveRequiredLevel(
  item: VisibilityItem,
  collection: VisibilityCollection
): MembershipLevel {
  return item.visibilityOverride ?? collection.defaultVisibility;
}

export function filterVisibleItems<TItem extends VisibilityItem>(
  viewer: Viewer,
  items: TItem[],
  collection: VisibilityCollection
): TItem[] {
  return items.filter((item) => canViewContent(viewer, resolveRequiredLevel(item, collection)));
}
