import { useEffect, useRef } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppStateProvider, useAppState } from "@/state/AppStateProvider";

vi.mock("@/services/content-client", () => ({
  fetchRemoteContentDataset: vi.fn(),
  publishRemoteContent: vi.fn()
}));

const { fetchRemoteContentDataset, publishRemoteContent } = await import("@/services/content-client");

function DoublePublishProbe() {
  const { posts, publishPost, loginAs } = useAppState();
  const didPublish = useRef(false);

  useEffect(() => {
    if (didPublish.current) {
      return;
    }

    didPublish.current = true;
    loginAs("admin-1");
    publishPost({
      title: "First local post",
      body: "first",
      visibility: "public"
    });
    publishPost({
      title: "Second local post",
      body: "second",
      visibility: "public"
    });
  }, [loginAs, publishPost]);

  return <output aria-label="post count">{posts.length}</output>;
}

function PostCountProbe() {
  const { posts } = useAppState();

  return <output aria-label="post count">{posts.length}</output>;
}

function CurrentIdentityProbe() {
  const { currentUser, viewer } = useAppState();

  return (
    <output aria-label="current identity">
      {currentUser ? currentUser.name : "visitor"}:{viewer ? viewer.level : "public"}
    </output>
  );
}

function AuthSessionProbe() {
  const { authSession } = useAppState();

  return <output aria-label="auth token">{authSession?.accessToken ?? "none"}</output>;
}

function RemoteLoginProbe() {
  const { loginWithPassword } = useAppState();
  const didLogin = useRef(false);

  useEffect(() => {
    if (didLogin.current) {
      return;
    }

    didLogin.current = true;
    void loginWithPassword({ email: "member@example.com", password: "secret-password" });
  }, [loginWithPassword]);

  return (
    <>
      <CurrentIdentityProbe />
      <AuthSessionProbe />
    </>
  );
}

function RemotePublishProbe() {
  const { authSession, loginWithPassword, posts, publishPost } = useAppState();
  const didLogin = useRef(false);
  const didPublish = useRef(false);

  useEffect(() => {
    if (!didLogin.current) {
      didLogin.current = true;
      void loginWithPassword({ email: "admin@example.com", password: "secret-password" });
      return;
    }

    if (!authSession || didPublish.current) {
      return;
    }

    didPublish.current = true;
    publishPost({
      body: "Remote body",
      coverImage: "https://images.example/remote.jpg",
      title: "Remote post",
      visibility: "gold"
    });
  }, [authSession, loginWithPassword, publishPost]);

  return <output aria-label="latest post">{posts[0]?.id ?? "none"}</output>;
}

function VideoPublishProbe() {
  const { createVideoCollectionWithVideo, loginAs, videoCollections, videos } = useAppState();
  const didPublish = useRef(false);

  useEffect(() => {
    if (didPublish.current) {
      return;
    }

    didPublish.current = true;
    loginAs("admin-1");
    createVideoCollectionWithVideo({
      cloudinaryPublicId: "collection-1/trailer",
      description: "Uploaded video",
      playbackUrl: "https://res.cloudinary.com/demo/video/upload/trailer.mp4",
      thumbnailUrl: "https://res.cloudinary.com/demo/video/upload/so_0/trailer.jpg",
      title: "Uploaded collection",
      videoTitle: "Uploaded trailer",
      visibility: "gold"
    });
  }, [createVideoCollectionWithVideo, loginAs]);

  return (
    <>
      <output aria-label="latest video public id">{videos[0]?.cloudinaryPublicId ?? "none"}</output>
      <output aria-label="latest video thumbnail">{videos[0]?.thumbnailUrl ?? "none"}</output>
      <output aria-label="latest video cover">{videoCollections[0]?.coverImage ?? "none"}</output>
    </>
  );
}

describe("AppStateProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(fetchRemoteContentDataset).mockRejectedValue(new Error("Supabase content is not configured"));
    vi.mocked(publishRemoteContent).mockRejectedValue(new Error("Supabase content is not configured"));
  });

  it("starts as a visitor when there is no saved login", async () => {
    window.localStorage.clear();

    render(
      <AppStateProvider>
        <CurrentIdentityProbe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("current identity")).toHaveTextContent("visitor:public");
    });
  });

  it("keeps multiple queued post publishes instead of overwriting with stale state", async () => {
    window.localStorage.clear();

    render(
      <AppStateProvider>
        <DoublePublishProbe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("post count")).toHaveTextContent("6");
    });
  });

  it("hydrates saved content before writing back to localStorage", async () => {
    const saved = {
      users: [],
      invites: [],
      posts: [
        {
          id: "saved-post",
          type: "post",
          title: "Saved post",
          excerpt: "Saved",
          body: "Saved",
          coverImage: "https://example.com/saved.jpg",
          visibility: "public",
          publishedAt: "2026-06-18"
        }
      ],
      albums: [],
      photos: [],
      videoCollections: [],
      videos: [],
      currentUserId: null
    };

    window.localStorage.setItem("media-gate-state-v1", JSON.stringify(saved));

    render(
      <AppStateProvider>
        <PostCountProbe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("post count")).toHaveTextContent("1");
    });

    const persisted = JSON.parse(window.localStorage.getItem("media-gate-state-v1") ?? "{}");
    expect(persisted.posts).toHaveLength(1);
    expect(persisted.posts[0].title).toBe("Saved post");
  });

  it("stores Supabase login sessions and exposes the profile as the current user", async () => {
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          accessToken: "access-token",
          expiresIn: 3600,
          profile: {
            disabled: false,
            displayName: "Member",
            email: "member@example.com",
            isAdmin: false,
            level: "gold",
            userId: "user-1"
          },
          refreshToken: "refresh-token"
        })
      })) as unknown as typeof fetch
    );

    render(
      <AppStateProvider>
        <RemoteLoginProbe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("current identity")).toHaveTextContent("Member:gold");
      expect(screen.getByLabelText("auth token")).toHaveTextContent("access-token");
    });

    const persisted = JSON.parse(window.localStorage.getItem("media-gate-state-v1") ?? "{}");
    expect(persisted.authSession).toMatchObject({
      accessToken: "access-token",
      refreshToken: "refresh-token"
    });
    expect(persisted.currentUserId).toBe("user-1");
  });

  it("loads remote Supabase content after hydration when content API is configured", async () => {
    window.localStorage.clear();
    vi.mocked(fetchRemoteContentDataset).mockResolvedValue({
      albums: [],
      photos: [],
      posts: [
        {
          body: "Remote body",
          coverImage: "https://images.example/remote.jpg",
          excerpt: "Remote",
          id: "remote-post",
          publishedAt: "2026-06-18",
          title: "Remote post",
          type: "post",
          visibility: "public"
        }
      ],
      videoCollections: [],
      videos: []
    });

    render(
      <AppStateProvider>
        <PostCountProbe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("post count")).toHaveTextContent("1");
    });
    expect(fetchRemoteContentDataset).toHaveBeenCalledWith(undefined);
  });

  it("keeps local demo content when remote content loading fails", async () => {
    window.localStorage.clear();
    vi.mocked(fetchRemoteContentDataset).mockRejectedValue(new Error("Supabase content is not configured"));

    render(
      <AppStateProvider>
        <PostCountProbe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("post count")).toHaveTextContent("4");
    });
  });

  it("publishes posts through Supabase when an admin auth session exists", async () => {
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          accessToken: "admin-access-token",
          expiresIn: 3600,
          profile: {
            disabled: false,
            displayName: "Admin",
            email: "admin@example.com",
            isAdmin: true,
            level: "diamond",
            userId: "admin-1"
          },
          refreshToken: "refresh-token"
        })
      })) as unknown as typeof fetch
    );
    vi.mocked(publishRemoteContent).mockResolvedValue({
      post: {
        body: "Remote body",
        coverImage: "https://images.example/remote.jpg",
        excerpt: "Remote body",
        id: "remote-post",
        publishedAt: "2026-06-18",
        title: "Remote post",
        type: "post",
        visibility: "gold"
      }
    });

    render(
      <AppStateProvider>
        <RemotePublishProbe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("latest post")).toHaveTextContent("remote-post");
    });
    expect(publishRemoteContent).toHaveBeenCalledWith(
      "admin-access-token",
      expect.objectContaining({
        body: "Remote body",
        kind: "post",
        title: "Remote post",
        visibility: "gold"
      })
    );
  });

  it("keeps uploaded Cloudinary video metadata when creating local video records", async () => {
    window.localStorage.clear();

    render(
      <AppStateProvider>
        <VideoPublishProbe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("latest video public id")).toHaveTextContent("collection-1/trailer");
      expect(screen.getByLabelText("latest video thumbnail")).toHaveTextContent(
        "https://res.cloudinary.com/demo/video/upload/so_0/trailer.jpg"
      );
      expect(screen.getByLabelText("latest video cover")).toHaveTextContent(
        "https://res.cloudinary.com/demo/video/upload/so_0/trailer.jpg"
      );
    });
  });
});
