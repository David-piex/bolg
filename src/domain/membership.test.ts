import { describe, expect, it } from "vitest";
import { canManage, canViewContent } from "@/domain/membership";

describe("membership access", () => {
  const visitor = null;
  const normalUser = { level: "normal" as const, disabled: false, isAdmin: false };
  const goldUser = { level: "gold" as const, disabled: false, isAdmin: false };
  const diamondUser = { level: "diamond" as const, disabled: false, isAdmin: false };
  const disabledUser = { level: "diamond" as const, disabled: true, isAdmin: false };
  const admin = { level: "normal" as const, disabled: false, isAdmin: true };

  it("lets visitors see only public content", () => {
    expect(canViewContent(visitor, "public")).toBe(true);
    expect(canViewContent(visitor, "normal")).toBe(false);
    expect(canViewContent(visitor, "gold")).toBe(false);
    expect(canViewContent(visitor, "diamond")).toBe(false);
  });

  it("lets normal users see public and normal content", () => {
    expect(canViewContent(normalUser, "public")).toBe(true);
    expect(canViewContent(normalUser, "normal")).toBe(true);
    expect(canViewContent(normalUser, "gold")).toBe(false);
    expect(canViewContent(normalUser, "diamond")).toBe(false);
  });

  it("lets gold users see public, normal, and gold content", () => {
    expect(canViewContent(goldUser, "public")).toBe(true);
    expect(canViewContent(goldUser, "normal")).toBe(true);
    expect(canViewContent(goldUser, "gold")).toBe(true);
    expect(canViewContent(goldUser, "diamond")).toBe(false);
  });

  it("lets diamond users see every member tier", () => {
    expect(canViewContent(diamondUser, "public")).toBe(true);
    expect(canViewContent(diamondUser, "normal")).toBe(true);
    expect(canViewContent(diamondUser, "gold")).toBe(true);
    expect(canViewContent(diamondUser, "diamond")).toBe(true);
  });

  it("blocks disabled users from private content", () => {
    expect(canViewContent(disabledUser, "public")).toBe(true);
    expect(canViewContent(disabledUser, "normal")).toBe(false);
    expect(canViewContent(disabledUser, "gold")).toBe(false);
    expect(canViewContent(disabledUser, "diamond")).toBe(false);
  });

  it("lets admins manage content", () => {
    expect(canManage(admin)).toBe(true);
    expect(canManage(normalUser)).toBe(false);
    expect(canManage(disabledUser)).toBe(false);
  });
});
