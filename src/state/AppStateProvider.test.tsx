import { useEffect, useRef } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppStateProvider, useAppState } from "@/state/AppStateProvider";

vi.mock("@/services/content-client", () => ({
  deleteRemoteContent: vi.fn(),
  fetchRemoteContentDataset: vi.fn(),
  publishRemoteContent: vi.fn(),
  updateRemoteContent: vi.fn()
}));

vi.mock("@/services/admin-client", () => ({
  createRemoteInvite: vi.fn(),
  deleteRemoteInvite: vi.fn(),
  fetchRemoteAdminDataset: vi.fn(),
  updateRemoteUser: vi.fn()
}));

const { deleteRemoteContent, fetchRemoteContentDataset, publishRemoteContent, updateRemoteContent } = await import(
  "@/services/content-client"
);
const { createRemoteInvite, deleteRemoteInvite, fetchRemoteAdminDataset, updateRemoteUser } = await import(
  "@/services/admin-client"
);

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

function PostIdsProbe() {
  const { posts } = useAppState();

  return <output aria-label="post ids">{posts.map((post) => post.id).join(",")}</output>;
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

function RemoteLogoutProbe() {
  const { currentUser, loginWithPassword, logout } = useAppState();
  const didLogin = useRef(false);
  const didLogout = useRef(false);

  useEffect(() => {
    if (!didLogin.current) {
      didLogin.current = true;
      void loginWithPassword({ email: "member@example.com", password: "secret-password" });
      return;
    }

    if (!currentUser || didLogout.current) {
      return;
    }

    didLogout.current = true;
    void logout();
  }, [currentUser, loginWithPassword, logout]);

  return (
    <>
      <CurrentIdentityProbe />
      <AuthSessionProbe />
    </>
  );
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
      scheduledAt: "2026-06-30",
      status: "scheduled",
      title: "Remote post",
      visibility: "gold"
    });
  }, [authSession, loginWithPassword, publishPost]);

  return <output aria-label="latest post">{posts[0]?.id ?? "none"}</output>;
}

function ScheduledRemotePublishProbe() {
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
      scheduledAt: "2026-06-30",
      status: "scheduled",
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
      mediaAssetId: "media-video",
      description: "Uploaded video",
      playbackUrl: "/api/media/media-video/access",
      thumbnailUrl: "https://images.example/video-cover.jpg",
      title: "Uploaded collection",
      videoTitle: "Uploaded trailer",
      visibility: "gold"
    });
  }, [createVideoCollectionWithVideo, loginAs]);

  return (
    <>
      <output aria-label="latest video public id">{videos[0]?.mediaAssetId ?? "none"}</output>
      <output aria-label="latest video thumbnail">{videos[0]?.thumbnailUrl ?? "none"}</output>
      <output aria-label="latest video cover">{videoCollections[0]?.coverImage ?? "none"}</output>
    </>
  );
}

function RemoteAdminDatasetProbe() {
  const { invites, loginWithPassword, users } = useAppState();
  const didLogin = useRef(false);

  useEffect(() => {
    if (didLogin.current) {
      return;
    }

    didLogin.current = true;
    void loginWithPassword({ email: "admin@example.com", password: "secret-password" });
  }, [loginWithPassword]);

  return (
    <>
      <CurrentIdentityProbe />
      <output aria-label="admin user count">{users.length}</output>
      <output aria-label="invite count">{invites.length}</output>
    </>
  );
}

function RemoteInviteProbe() {
  const { generateInvite, invites, loginWithPassword } = useAppState();
  const didLogin = useRef(false);
  const didGenerate = useRef(false);

  useEffect(() => {
    if (!didLogin.current) {
      didLogin.current = true;
      void loginWithPassword({ email: "admin@example.com", password: "secret-password" });
      return;
    }

    if (didGenerate.current) {
      return;
    }

    didGenerate.current = true;
    generateInvite("gold");
  }, [generateInvite, loginWithPassword]);

  return <output aria-label="latest invite">{invites[0]?.code ?? "none"}</output>;
}

function RemoteUserUpdateProbe() {
  const { loginWithPassword, toggleUserDisabled, updateUserLevel, users } = useAppState();
  const didLogin = useRef(false);
  const didUpdate = useRef(false);

  useEffect(() => {
    if (!didLogin.current) {
      didLogin.current = true;
      void loginWithPassword({ email: "admin@example.com", password: "secret-password" });
      return;
    }

    if (didUpdate.current) {
      return;
    }

    didUpdate.current = true;
    updateUserLevel("user-normal", "diamond");
    toggleUserDisabled("user-normal");
  }, [loginWithPassword, toggleUserDisabled, updateUserLevel]);

  const user = users.find((candidate) => candidate.id === "user-normal");
  return <output aria-label="updated user">{user ? `${user.level}:${user.disabled}` : "none"}</output>;
}

function RemoteContentCrudProbe() {
  const { deleteContent, loginWithPassword, posts, updatePost } = useAppState();
  const didLogin = useRef(false);
  const didUpdate = useRef(false);

  useEffect(() => {
    if (!didLogin.current) {
      didLogin.current = true;
      void loginWithPassword({ email: "admin@example.com", password: "secret-password" });
      return;
    }

    if (didUpdate.current) {
      return;
    }

    didUpdate.current = true;
    updatePost({
      body: "Changed",
      coverImage: "https://images.example/changed.jpg",
      id: "post-public",
      title: "Changed title",
      visibility: "gold"
    });
    deleteContent({ id: "post-normal", kind: "post" });
  }, [deleteContent, loginWithPassword, updatePost]);

  return (
    <>
      <output aria-label="first post title">{posts.find((post) => post.id === "post-public")?.title ?? "none"}</output>
      <output aria-label="deleted post">{posts.some((post) => post.id === "post-normal") ? "present" : "gone"}</output>
    </>
  );
}

function RemoteViewMediaUpdateProbe() {
  const { authSession, loginWithPassword, posts, updatePost } = useAppState();
  const didLogin = useRef(false);
  const didUpdate = useRef(false);

  useEffect(() => {
    if (!didLogin.current) {
      didLogin.current = true;
      void loginWithPassword({ email: "admin@example.com", password: "secret-password" });
      return;
    }

    if (!authSession || didUpdate.current || posts.length === 0) {
      return;
    }

    didUpdate.current = true;
    updatePost({
      body: "Keep media",
      coverImage: "/api/media/media-from-view/view",
      id: "post-public",
      title: "Keep media title",
      visibility: "gold"
    });
  }, [authSession, loginWithPassword, posts, updatePost]);

  return <output aria-label="view media update">{posts.find((post) => post.id === "post-public")?.title ?? "none"}</output>;
}

describe("AppStateProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.mocked(fetchRemoteContentDataset).mockRejectedValue(new Error("Java content API is not configured"));
    vi.mocked(publishRemoteContent).mockRejectedValue(new Error("Java content API is not configured"));
    vi.mocked(fetchRemoteAdminDataset).mockRejectedValue(new Error("Admin API failed"));
    vi.mocked(createRemoteInvite).mockRejectedValue(new Error("Invite creation failed"));
    vi.mocked(updateRemoteUser).mockRejectedValue(new Error("User update failed"));
    vi.mocked(deleteRemoteInvite).mockRejectedValue(new Error("Invite delete failed"));
    vi.mocked(updateRemoteContent).mockRejectedValue(new Error("Content update failed"));
    vi.mocked(deleteRemoteContent).mockRejectedValue(new Error("Content delete failed"));
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

  it("cleans broken question-mark names from saved admin profiles", async () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      "media-gate-state-v1",
      JSON.stringify({
        users: [
          {
            disabled: false,
            email: "admin@example.com",
            id: "admin-1",
            isAdmin: true,
            level: "diamond",
            name: "?????"
          }
        ],
        invites: [],
        posts: [],
        albums: [],
        photos: [],
        videoCollections: [],
        videos: [],
        currentUserId: "admin-1",
        authSession: null
      })
    );

    render(
      <AppStateProvider>
        <CurrentIdentityProbe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("current identity")).toHaveTextContent("管理员:diamond");
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

  it("stores Java cookie login sessions and exposes the profile as the current user", async () => {
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ displayName: "Member", email: "member@example.com", id: "user-1", memberLevel: "GOLD", role: "USER", username: "member" })
      })) as unknown as typeof fetch
    );

    render(
      <AppStateProvider>
        <RemoteLoginProbe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("current identity")).toHaveTextContent("Member:gold");
      expect(screen.getByLabelText("auth token")).toHaveTextContent("cookie-session");
    });

    await waitFor(() => {
      const persisted = JSON.parse(window.localStorage.getItem("media-gate-state-v1") ?? "{}");
      expect(persisted.authSession).toMatchObject({
        accessToken: "cookie-session",
        refreshToken: "cookie-session"
      });
      expect(persisted.currentUserId).toBe("user-1");
    });
  });

  it("logs out through the Java API and clears the local session", async () => {
    window.localStorage.clear();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/logout") {
        return {
          ok: true,
          status: 204,
          json: async () => ({})
        };
      }

      if (url === "/api/auth/me") {
        return {
          ok: false,
          status: 401,
          json: async () => ({ errorCode: "UNAUTHORIZED", message: "未登录" })
        };
      }

      return {
        ok: true,
        json: async () => ({
          displayName: "Member",
          email: "member@example.com",
          id: "user-1",
          memberLevel: "GOLD",
          role: "USER",
          username: "member"
        })
      };
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <AppStateProvider>
        <RemoteLogoutProbe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", {
        credentials: "include",
        headers: expect.any(Headers),
        method: "POST"
      });
      expect(screen.getByLabelText("current identity")).toHaveTextContent("visitor:public");
      expect(screen.getByLabelText("auth token")).toHaveTextContent("none");
    });
  });

  it("clears saved user state when the Java session can no longer be restored", async () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      "media-gate-state-v1",
      JSON.stringify({
        users: [
          {
            disabled: false,
            email: "admin@example.com",
            id: "admin-1",
            isAdmin: true,
            level: "diamond",
            name: "Admin"
          }
        ],
        invites: [],
        posts: [],
        albums: [],
        photos: [],
        videoCollections: [],
        videos: [],
        currentUserId: "admin-1",
        authSession: {
          accessToken: "cookie-session",
          expiresIn: 900,
          refreshToken: "cookie-session"
        }
      })
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === "/api/auth/me") {
          return {
            ok: false,
            status: 401,
            json: async () => ({ errorCode: "UNAUTHENTICATED", message: "请先登录" })
          };
        }

        return {
          ok: true,
          json: async () => ({})
        };
      }) as unknown as typeof fetch
    );

    render(
      <AppStateProvider>
        <CurrentIdentityProbe />
        <AuthSessionProbe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("current identity")).toHaveTextContent("visitor:public");
      expect(screen.getByLabelText("auth token")).toHaveTextContent("none");
    });

    await waitFor(() => {
      const persisted = JSON.parse(window.localStorage.getItem("media-gate-state-v1") ?? "{}");
      expect(persisted.currentUserId).toBeNull();
      expect(persisted.authSession).toBeNull();
    });
  });

  it("preserves saved user state when session restoration hits a transient error", async () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      "media-gate-state-v1",
      JSON.stringify({
        users: [
          {
            disabled: false,
            email: "admin@example.com",
            id: "admin-1",
            isAdmin: true,
            level: "diamond",
            name: "Admin"
          }
        ],
        invites: [],
        posts: [],
        albums: [],
        photos: [],
        videoCollections: [],
        videos: [],
        currentUserId: "admin-1",
        authSession: {
          accessToken: "cookie-session",
          expiresIn: 900,
          refreshToken: "cookie-session"
        }
      })
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === "/api/auth/me") {
          return {
            ok: false,
            status: 500,
            json: async () => ({ errorCode: "SERVER_ERROR", message: "Temporary failure" })
          };
        }

        return {
          ok: true,
          json: async () => ({})
        };
      }) as unknown as typeof fetch
    );

    render(
      <AppStateProvider>
        <CurrentIdentityProbe />
        <AuthSessionProbe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("current identity")).toHaveTextContent("Admin:diamond");
      expect(screen.getByLabelText("auth token")).toHaveTextContent("cookie-session");
    });

    await waitFor(() => {
      const persisted = JSON.parse(window.localStorage.getItem("media-gate-state-v1") ?? "{}");
      expect(persisted.currentUserId).toBe("admin-1");
      expect(persisted.authSession).toMatchObject({
        accessToken: "cookie-session",
        refreshToken: "cookie-session"
      });
    });
  });

  it("loads remote Java content after hydration when content API is configured", async () => {
    window.localStorage.clear();
    vi.mocked(fetchRemoteContentDataset).mockResolvedValue({
      albums: [],
      photos: [],
      posts: [
        {
          body: "Remote body",
          category: "remote",
          coverImage: "https://images.example/remote.jpg",
          excerpt: "Remote",
          id: "remote-post",
          pinned: false,
          publishedAt: "2026-06-18",
          status: "published",
          tags: ["sync"],
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

  it("refreshes server-seeded initial content after a remote session is restored", async () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      "media-gate-state-v1",
      JSON.stringify({
        users: [
          {
            disabled: false,
            email: "admin@example.com",
            id: "admin-1",
            isAdmin: true,
            level: "diamond",
            name: "Admin"
          }
        ],
        invites: [],
        posts: [],
        albums: [],
        photos: [],
        videoCollections: [],
        videos: [],
        currentUserId: "admin-1",
        authSession: {
          accessToken: "cookie-session",
          expiresIn: 900,
          refreshToken: "cookie-session"
        }
      })
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === "/api/auth/me") {
          return {
            ok: true,
            json: async () => ({
              displayName: "Admin",
              email: "admin@example.com",
              id: "admin-1",
              memberLevel: "DIAMOND",
              role: "ADMIN",
              username: "admin"
            })
          };
        }

        return {
          ok: true,
          json: async () => ({})
        };
      }) as unknown as typeof fetch
    );
    vi.mocked(fetchRemoteContentDataset).mockResolvedValue({
      albums: [],
      photos: [],
      posts: [
        {
          body: "Admin-only body",
          category: "remote",
          coverImage: "https://images.example/admin.jpg",
          excerpt: "Admin",
          id: "remote-admin-post",
          pinned: false,
          publishedAt: "2026-06-18",
          status: "published",
          tags: ["admin"],
          title: "Admin post",
          type: "post",
          visibility: "diamond"
        }
      ],
      videoCollections: [],
      videos: []
    });

    render(
      <AppStateProvider
        initialContent={{
          albums: [],
          photos: [],
          posts: [
            {
              body: "Visitor body",
              category: "visitor",
              coverImage: "https://images.example/visitor.jpg",
              excerpt: "Visitor",
              id: "server-visitor-post",
              pinned: false,
              publishedAt: "2026-06-18",
              status: "published",
              tags: ["visitor"],
              title: "Visitor post",
              type: "post",
              visibility: "public"
            }
          ],
          videoCollections: [],
          videos: []
        }}
      >
        <PostIdsProbe />
      </AppStateProvider>
    );

    expect(screen.getByLabelText("post ids")).toHaveTextContent("server-visitor-post");
    await waitFor(() => {
      expect(screen.getByLabelText("post ids")).toHaveTextContent("remote-admin-post");
    });
    expect(fetchRemoteContentDataset).toHaveBeenCalledWith("cookie-session");
  });

  it("does not persist remote content payloads or signed media URLs into localStorage", async () => {
    window.localStorage.clear();
    vi.mocked(fetchRemoteContentDataset).mockResolvedValue({
      albums: [],
      photos: [],
      posts: [
        {
          body: "Remote body",
          category: "remote",
          coverImage: "http://minio.local/signed-cover.jpg?X-Amz-Signature=secret",
          excerpt: "Remote",
          id: "remote-post",
          pinned: false,
          publishedAt: "2026-06-18",
          status: "published",
          tags: ["sync"],
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

    const persisted = JSON.parse(window.localStorage.getItem("media-gate-state-v1") ?? "{}");
    expect(JSON.stringify(persisted)).not.toContain("signed-cover");
    expect(persisted.posts).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "remote-post" })])
    );
  });

  it("keeps local demo content when remote content loading fails", async () => {
    window.localStorage.clear();
    vi.mocked(fetchRemoteContentDataset).mockRejectedValue(new Error("Java content API is not configured"));

    render(
      <AppStateProvider>
        <PostCountProbe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("post count")).toHaveTextContent("4");
    });
  });

  it("does not show seed demo content in production when the content API fails", async () => {
    window.localStorage.clear();
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(fetchRemoteContentDataset).mockRejectedValue(new Error("Java content API is not configured"));

    render(
      <AppStateProvider>
        <PostCountProbe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("post count")).toHaveTextContent("0");
    });
  });

  it("publishes posts through the Java API when an admin auth session exists", async () => {
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ displayName: "Admin", email: "admin@example.com", id: "admin-1", memberLevel: "DIAMOND", role: "ADMIN", username: "admin" })
      })) as unknown as typeof fetch
    );
    vi.mocked(publishRemoteContent).mockResolvedValue({
      post: {
        body: "Remote body",
        category: "remote",
        coverImage: "https://images.example/remote.jpg",
        excerpt: "Remote body",
        id: "remote-post",
        pinned: true,
        publishedAt: "2026-06-18",
        status: "published",
        tags: ["sync"],
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
      "cookie-session",
      expect.objectContaining({
        body: "Remote body",
        kind: "post",
        title: "Remote post",
        visibility: "gold"
      })
    );
  });

  it("keeps scheduled timestamps when publishing remote posts through the Java API", async () => {
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ displayName: "Admin", email: "admin@example.com", id: "admin-1", memberLevel: "DIAMOND", role: "ADMIN", username: "admin" })
      })) as unknown as typeof fetch
    );
    let scheduledRequest: unknown = null;
    vi.mocked(publishRemoteContent).mockResolvedValue({
      post: {
        body: "Remote body",
        category: "remote",
        coverImage: "https://images.example/remote.jpg",
        excerpt: "Remote body",
        id: "remote-post",
        pinned: true,
        publishedAt: "",
        scheduledAt: "2026-06-30",
        status: "scheduled",
        tags: ["sync"],
        title: "Remote post",
        type: "post",
        visibility: "gold"
      }
    });
    vi.mocked(publishRemoteContent).mockImplementation(async (token, input) => {
      if (input.kind === "post" && input.scheduledAt === "2026-06-30") {
        scheduledRequest = input;
      }

      return {
        post: {
          body: "Remote body",
          category: "remote",
          coverImage: "https://images.example/remote.jpg",
          excerpt: "Remote body",
          id: "remote-post",
          pinned: true,
          publishedAt: "",
          scheduledAt: "2026-06-30",
          status: "scheduled",
          tags: ["sync"],
          title: "Remote post",
          type: "post",
          visibility: "gold"
        }
      };
    });

    render(
      <AppStateProvider>
        <ScheduledRemotePublishProbe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("latest post")).toHaveTextContent("remote-post");
    });
    expect(scheduledRequest).toMatchObject({
      scheduledAt: "2026-06-30",
      status: "scheduled"
    });
  });

  it("keeps uploaded Java media metadata when creating local video records", async () => {
    window.localStorage.clear();

    render(
      <AppStateProvider>
        <VideoPublishProbe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("latest video public id")).toHaveTextContent("media-video");
      expect(screen.getByLabelText("latest video thumbnail")).toHaveTextContent(
        "https://images.example/video-cover.jpg"
      );
      expect(screen.getByLabelText("latest video cover")).toHaveTextContent(
        "https://images.example/video-cover.jpg"
      );
    });
  });

  it("loads remote admin users and invites for logged-in admins", async () => {
    window.localStorage.clear();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ displayName: "Admin", email: "admin@example.com", id: "admin-1", memberLevel: "DIAMOND", role: "ADMIN", username: "admin" })
      })) as unknown as typeof fetch
    );
    vi.mocked(fetchRemoteAdminDataset).mockResolvedValue({
      invites: [{ code: "GOLD-REMOTE", expiresAt: "2026-07-01T00:00:00Z", id: "invite-remote", targetLevel: "gold", usedByUserId: null }],
      userPage: {
        page: 0,
        size: 10,
        total: 1,
        totalPages: 1,
        users: [
          {
            disabled: false,
            email: "member@example.com",
            id: "member-1",
            isAdmin: true,
            level: "gold",
            name: "Member"
          }
        ]
      },
      users: [
        {
          disabled: false,
          email: "member@example.com",
          id: "member-1",
          isAdmin: true,
          level: "gold",
          name: "Member"
        }
      ]
    });

    render(
      <AppStateProvider>
        <RemoteAdminDatasetProbe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("current identity")).toHaveTextContent("Admin:diamond");
      expect(screen.getByLabelText("admin user count")).toHaveTextContent("2");
      expect(screen.getByLabelText("invite count")).toHaveTextContent("1");
    });
    expect(fetchRemoteAdminDataset).toHaveBeenCalledWith("cookie-session");
  });

  it("creates invite codes remotely when an admin session exists", async () => {
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ displayName: "Admin", email: "admin@example.com", id: "admin-1", memberLevel: "DIAMOND", role: "ADMIN", username: "admin" })
      })) as unknown as typeof fetch
    );
    vi.mocked(createRemoteInvite).mockResolvedValue({
      code: "GOLD-REMOTE",
      id: "invite-remote",
      expiresAt: "2026-07-01T00:00:00Z",
      targetLevel: "gold",
      usedByUserId: null
    });

    render(
      <AppStateProvider>
        <RemoteInviteProbe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("latest invite")).toHaveTextContent("GOLD-REMOTE");
    });
    expect(createRemoteInvite).toHaveBeenCalledWith("cookie-session", "gold", undefined);
  });

  it("updates user level and disabled state remotely when an admin session exists", async () => {
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ displayName: "Admin", email: "admin@example.com", id: "admin-1", memberLevel: "DIAMOND", role: "ADMIN", username: "admin" })
      })) as unknown as typeof fetch
    );
    vi.mocked(updateRemoteUser).mockResolvedValue();

    render(
      <AppStateProvider>
        <RemoteUserUpdateProbe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("updated user")).toHaveTextContent("diamond:true");
    });
    expect(updateRemoteUser).toHaveBeenCalledWith("cookie-session", {
      level: "diamond",
      userId: "user-normal"
    });
    expect(updateRemoteUser).toHaveBeenCalledWith("cookie-session", {
      disabled: true,
      userId: "user-normal"
    });
  });

  it("updates and deletes content remotely when an admin session exists", async () => {
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ displayName: "Admin", email: "admin@example.com", id: "admin-1", memberLevel: "DIAMOND", role: "ADMIN", username: "admin" })
      })) as unknown as typeof fetch
    );
    vi.mocked(updateRemoteContent).mockResolvedValue();
    vi.mocked(deleteRemoteContent).mockResolvedValue();

    render(
      <AppStateProvider>
        <RemoteContentCrudProbe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("first post title")).toHaveTextContent("Changed title");
      expect(screen.getByLabelText("deleted post")).toHaveTextContent("gone");
    });
    expect(updateRemoteContent).toHaveBeenCalledWith(
      "cookie-session",
      expect.objectContaining({ id: "post-public", kind: "post", title: "Changed title" })
    );
    expect(deleteRemoteContent).toHaveBeenCalledWith("cookie-session", {
      id: "post-normal",
      kind: "post"
    });
  });

  it("preserves Java media ids when updating content with stable view URLs", async () => {
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ displayName: "Admin", email: "admin@example.com", id: "admin-1", memberLevel: "DIAMOND", role: "ADMIN", username: "admin" })
      })) as unknown as typeof fetch
    );
    vi.mocked(fetchRemoteContentDataset).mockResolvedValue({
      albums: [],
      photos: [],
      posts: [
        {
          body: "Original",
          category: "remote",
          coverImage: "/api/media/media-from-view/view",
          excerpt: "Original",
          id: "post-public",
          pinned: false,
          publishedAt: "2026-06-18",
          status: "published",
          tags: ["sync"],
          title: "Original",
          type: "post",
          visibility: "public"
        }
      ],
      videoCollections: [],
      videos: []
    });
    vi.mocked(updateRemoteContent).mockResolvedValue();

    render(
      <AppStateProvider>
        <RemoteViewMediaUpdateProbe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(updateRemoteContent).toHaveBeenCalledWith(
        "cookie-session",
        expect.objectContaining({
          id: "post-public",
          kind: "post",
          mediaAssetId: "media-from-view"
        })
      );
    });
  });
});
