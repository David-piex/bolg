import { describe, expect, it } from "vitest";
import { filterVisibleItems, resolveRequiredLevel } from "@/domain/content";

describe("content visibility", () => {
  const visitor = null;
  const goldUser = { level: "gold" as const, disabled: false, isAdmin: false };
  const diamondUser = { level: "diamond" as const, disabled: false, isAdmin: false };

  const collection = {
    id: "album-1",
    defaultVisibility: "gold" as const
  };

  const items = [
    {
      id: "photo-public",
      collectionId: "album-1",
      title: "Public photo",
      visibilityOverride: "public" as const
    },
    {
      id: "photo-inherited",
      collectionId: "album-1",
      title: "Inherited gold photo",
      visibilityOverride: null
    },
    {
      id: "photo-diamond",
      collectionId: "album-1",
      title: "Diamond photo",
      visibilityOverride: "diamond" as const
    }
  ];

  it("uses an item override when one exists", () => {
    expect(resolveRequiredLevel(items[0], collection)).toBe("public");
    expect(resolveRequiredLevel(items[2], collection)).toBe("diamond");
  });

  it("inherits the collection default when an item has no override", () => {
    expect(resolveRequiredLevel(items[1], collection)).toBe("gold");
  });

  it("filters visitor content to public items", () => {
    expect(filterVisibleItems(visitor, items, collection).map((item) => item.id)).toEqual(["photo-public"]);
  });

  it("filters gold content to public and gold inherited items", () => {
    expect(filterVisibleItems(goldUser, items, collection).map((item) => item.id)).toEqual([
      "photo-public",
      "photo-inherited"
    ]);
  });

  it("lets diamond users see every item in the collection", () => {
    expect(filterVisibleItems(diamondUser, items, collection).map((item) => item.id)).toEqual([
      "photo-public",
      "photo-inherited",
      "photo-diamond"
    ]);
  });
});
