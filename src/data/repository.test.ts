import { describe, expect, it } from "vitest";
import {
  getAdminSummary,
  getAlbums,
  getHomeFeed,
  getVideoCollections,
  getViewerByScenario
} from "@/data/repository";

describe("mock repository", () => {
  it("returns a visitor scenario with no private access", () => {
    expect(getViewerByScenario("visitor")).toBeNull();
  });

  it("filters the home feed for visitors", () => {
    const feed = getHomeFeed(getViewerByScenario("visitor"));

    expect(feed.every((item) => item.requiredLevel === "public")).toBe(true);
  });

  it("includes gold content for gold viewers but excludes diamond-only content", () => {
    const feed = getHomeFeed(getViewerByScenario("gold"));

    expect(feed.some((item) => item.requiredLevel === "gold")).toBe(true);
    expect(feed.some((item) => item.requiredLevel === "diamond")).toBe(false);
  });

  it("exposes album item inheritance and overrides", () => {
    const albums = getAlbums(getViewerByScenario("diamond"));
    const memberAlbum = albums.find((album) => album.id === "album-members");

    expect(memberAlbum?.photos.some((photo) => photo.requiredLevel === memberAlbum.defaultVisibility)).toBe(true);
    expect(memberAlbum?.photos.some((photo) => photo.visibilityOverride === "diamond")).toBe(true);
  });

  it("exposes video metadata needed for Cloudinary playback", () => {
    const collections = getVideoCollections(getViewerByScenario("diamond"));
    const firstVideo = collections.flatMap((collection) => collection.videos)[0];

    expect(firstVideo.cloudinaryPublicId).toBeTruthy();
    expect(firstVideo.playbackUrl).toMatch(/^https:\/\/res\.cloudinary\.com\//);
    expect(firstVideo.thumbnailUrl).toMatch(/^https:\/\/res\.cloudinary\.com\//);
  });

  it("summarizes admin users, invites, and content", () => {
    expect(getAdminSummary()).toMatchObject({
      users: 4,
      unusedInvites: 3,
      posts: 4,
      albums: 2,
      videoCollections: 2
    });
  });
});
