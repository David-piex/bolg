"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  deleteRemoteContent,
  fetchRemoteAlbumsPage,
  fetchRemoteContentDataset,
  fetchRemotePostsPage,
  fetchRemoteVideosPage,
  publishRemoteContent,
  updateRemoteContent,
  type RemoteContentPage
} from "@/services/content-client";
import {
  createRemoteInvite,
  deleteRemoteInvite,
  fetchRemoteAdminDataset,
  fetchRemoteAdminUsers,
  type AdminUserPage,
  updateRemoteUser
} from "@/services/admin-client";
import { consumeInviteCode, type InviteCode, type InviteTargetLevel } from "@/domain/invites";
import type { MembershipLevel, Viewer } from "@/domain/membership";
import { displayNameOrFallback } from "@/domain/display-name";
import {
  loginWithPasswordClient,
  registerWithInviteClient,
  getCurrentSessionClient,
  logoutClient,
  type ClientLoginSession
} from "@/services/auth-client";
import type { ContentDataset } from "@/data/repository";
import {
  albums as seedAlbums,
  invites as seedInvites,
  photos as seedPhotos,
  posts as seedPosts,
  users as seedUsers,
  videoCollections as seedVideoCollections,
  videos as seedVideos,
  type AlbumRecord,
  type PhotoRecord,
  type PostRecord,
  type UserProfile,
  type VideoCollectionRecord,
  type VideoRecord
} from "@/data/mock-data";

type RegisterResult =
  | { ok: true; message: "registered" }
  | { ok: false; reason: "missing" | "used" };

type RemoteAuthResult =
  | { ok: true; isAdmin: boolean }
  | { ok: false; message: string };

type AuthSession = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
};

type ContentState = {
  posts: PostRecord[];
  albums: AlbumRecord[];
  photos: PhotoRecord[];
  videoCollections: VideoCollectionRecord[];
  videos: VideoRecord[];
};

const defaultAdminUserPageSize = 10;

type AppStateValue = {
  users: UserProfile[];
  adminUserPage: AdminUserPage;
  invites: InviteCode[];
  posts: PostRecord[];
  albums: AlbumRecord[];
  photos: PhotoRecord[];
  videoCollections: VideoCollectionRecord[];
  videos: VideoRecord[];
  currentUserId: string | null;
  currentUser: UserProfile | null;
  authSession: AuthSession | null;
  authReady: boolean;
  viewer: Viewer;
  registerWithInvite: (input: { name: string; email: string; inviteCode: string }) => RegisterResult;
  registerWithPassword: (input: { name: string; email: string; inviteCode: string; password: string }) => Promise<RemoteAuthResult>;
  loginWithPassword: (input: { email: string; password: string }) => Promise<RemoteAuthResult>;
  loginAs: (userId: string | null) => void;
  logout: () => Promise<void>;
  loadAlbumsPage: (input: { page?: number; size?: number }) => Promise<RemoteContentPage<AlbumRecord>>;
  loadAdminUsersPage: (input: { page?: number; q?: string; size?: number }) => Promise<void>;
  loadPostsPage: (input: { page?: number; size?: number }) => Promise<RemoteContentPage<PostRecord>>;
  loadVideosPage: (input: { page?: number; size?: number }) => Promise<
    RemoteContentPage<{ collection: VideoCollectionRecord; video: VideoRecord }>
  >;
  updateUserLevel: (userId: string, level: Exclude<MembershipLevel, "public">) => void;
  toggleUserDisabled: (userId: string) => void;
  generateInvite: (level: Exclude<MembershipLevel, "public">) => Promise<string>;
  deleteInvite: (inviteId: string) => void;
  publishPost: (input: {
    title: string;
    body: string;
    visibility: MembershipLevel;
    coverImage?: string;
    mediaAssetId?: string;
  }) => Promise<void>;
  createAlbumWithPhoto: (input: {
    title: string;
    description: string;
    visibility: MembershipLevel;
    photoTitle: string;
    imageUrl?: string;
    mediaAssetId?: string;
  }) => Promise<void>;
  createVideoCollectionWithVideo: (input: {
    title: string;
    description: string;
    visibility: MembershipLevel;
    videoTitle: string;
    playbackUrl?: string;
    mediaAssetId?: string;
    coverMediaId?: string;
    thumbnailUrl?: string;
  }) => Promise<void>;
  updatePost: (input: {
    id: string;
    title: string;
    body: string;
    visibility: MembershipLevel;
    coverImage?: string;
    mediaAssetId?: string;
  }) => Promise<void>;
  updateAlbum: (input: {
    id: string;
    title: string;
    description: string;
    defaultVisibility: MembershipLevel;
    coverImage?: string;
    coverMediaId?: string;
  }) => Promise<void>;
  updateVideoCollection: (input: {
    id: string;
    title: string;
    description: string;
    defaultVisibility: MembershipLevel;
    coverImage?: string;
    coverMediaId?: string;
  }) => Promise<void>;
  deleteContent: (input: { kind: "post" | "album" | "video"; id: string }) => Promise<void>;
};

const storageKey = "media-gate-state-v1";

const AppStateContext = createContext<AppStateValue | null>(null);

function demoDataEnabled(): boolean {
  return process.env.NEXT_PUBLIC_RINANA_DEMO_MODE === "enabled" || process.env.NODE_ENV !== "production";
}

type PersistedState = {
  users: UserProfile[];
  invites: InviteCode[];
  posts: PostRecord[];
  albums: AlbumRecord[];
  photos: PhotoRecord[];
  videoCollections: VideoCollectionRecord[];
  videos: VideoRecord[];
  currentUserId: string | null;
  authSession: AuthSession | null;
};

function createInitialState(): PersistedState {
  if (!demoDataEnabled()) {
    return {
      users: [],
      invites: [],
      posts: [],
      albums: [],
      photos: [],
      videoCollections: [],
      videos: [],
      currentUserId: null,
      authSession: null
    };
  }

  return {
    users: seedUsers,
    invites: seedInvites,
    posts: seedPosts,
    albums: seedAlbums,
    photos: seedPhotos,
    videoCollections: seedVideoCollections,
    videos: seedVideos,
    currentUserId: null,
    authSession: null
  };
}

function emptyContentState(): ContentState {
  return {
    albums: [],
    photos: [],
    posts: [],
    videoCollections: [],
    videos: []
  };
}

function contentStateFromDataset(dataset: ContentDataset): ContentState {
  return {
    albums: dataset.albums ?? [],
    photos: dataset.photos ?? [],
    posts: dataset.posts ?? [],
    videoCollections: dataset.videoCollections ?? [],
    videos: dataset.videos ?? []
  };
}

function hasRemoteContent(content: ContentState): boolean {
  return (
    content.albums.length +
      content.photos.length +
      content.posts.length +
      content.videoCollections.length +
      content.videos.length >
    0
  );
}

function hydrateState(saved: Partial<PersistedState>): PersistedState {
  const initial = createInitialState();
  return {
    users: sanitizeUsers(saved.users ?? initial.users),
    invites: saved.invites ?? initial.invites,
    posts: saved.posts ?? initial.posts,
    albums: saved.albums ?? initial.albums,
    photos: saved.photos ?? initial.photos,
    videoCollections: saved.videoCollections ?? initial.videoCollections,
    videos: saved.videos ?? initial.videos,
    currentUserId: saved.currentUserId ?? initial.currentUserId,
    authSession: saved.authSession ?? initial.authSession
  };
}

function sanitizeUsers(users: UserProfile[]): UserProfile[] {
  return users.map((user) => ({
    ...user,
    name: displayNameOrFallback(
      {
        email: user.email,
        isAdmin: user.isAdmin,
        name: user.name
      },
      { admin: "管理员", user: "用户" }
    )
  }));
}

function toViewer(user: UserProfile | null): Viewer {
  if (!user) {
    return null;
  }

  return {
    level: user.level,
    disabled: user.disabled,
    isAdmin: user.isAdmin
  };
}

function makeInviteCode(level: Exclude<MembershipLevel, "public">): string {
  const prefix = level.toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${suffix}`;
}

function shortExcerpt(value: string, fallback: string): string {
  return (value.trim() || fallback.trim() || "新内容").slice(0, 120);
}

function userFromSession(session: ClientLoginSession): UserProfile {
  return {
    disabled: session.profile.disabled,
    email: session.profile.email,
    id: session.profile.userId,
    isAdmin: session.profile.isAdmin,
    level: session.profile.level,
    name: displayNameOrFallback(
      {
        email: session.profile.email,
        isAdmin: session.profile.isAdmin,
        name: session.profile.displayName
      },
      { admin: "管理员", user: "用户" }
    )
  };
}

function upsertUser(users: UserProfile[], user: UserProfile): UserProfile[] {
  const exists = users.some((current) => current.id === user.id);

  if (!exists) {
    return [...users, user];
  }

  return users.map((current) => (current.id === user.id ? user : current));
}

function mergeRemoteUsers(currentUsers: UserProfile[], remoteUsers: UserProfile[]): UserProfile[] {
  const remoteUserIds = new Set(remoteUsers.map((user) => user.id));
  return [...remoteUsers, ...currentUsers.filter((user) => !remoteUserIds.has(user.id))];
}

function mergeById<T extends { id: string }>(currentItems: T[], incomingItems: T[]): T[] {
  const incomingIds = new Set(incomingItems.map((item) => item.id));
  return [...incomingItems, ...currentItems.filter((item) => !incomingIds.has(item.id))];
}

function makeLocalAdminUserPage(users: UserProfile[], page = 0, size = defaultAdminUserPageSize): AdminUserPage {
  const safeSize = Math.max(1, size);
  const total = users.length;
  const totalPages = Math.max(1, Math.ceil(total / safeSize));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = safePage * safeSize;

  return {
    page: safePage,
    size: safeSize,
    total,
    totalPages,
    users: users.slice(start, start + safeSize)
  };
}

function sessionFromLogin(session: ClientLoginSession): AuthSession {
  return {
    accessToken: session.accessToken,
    expiresIn: session.expiresIn,
    refreshToken: session.refreshToken
  };
}

function mediaIdFromAccessUrl(value: string): string | undefined {
  const match = value.match(/^\/api\/media\/([^/]+)\/(?:access|view)$/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

function userCanManage(user: UserProfile | null): boolean {
  return Boolean(user?.isAdmin && !user.disabled);
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(createInitialState);
  const [remoteContent, setRemoteContent] = useState<ContentState>(emptyContentState);
  const [remoteAdminUserPage, setRemoteAdminUserPage] = useState<AdminUserPage | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      setState(hydrateState(JSON.parse(saved) as Partial<PersistedState>));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    let cancelled = false;
    const hadSavedAuthSession = Boolean(state.authSession);
    setAuthReady(false);

    void getCurrentSessionClient()
      .then((session) => {
        if (cancelled) {
          return;
        }

        if (!session) {
          if (hadSavedAuthSession) {
            setState((current) =>
              current.authSession
                ? {
                    ...current,
                    authSession: null,
                    currentUserId: null
                  }
                : current
            );
          }
          return;
        }

        const user = userFromSession(session);
        setState((current) => ({
          ...current,
          authSession: sessionFromLogin(session),
          currentUserId: user.id,
          users: upsertUser(current.users, user)
        }));
      })
      .finally(() => {
        if (!cancelled) {
          setAuthReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [hydrated, state]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    let cancelled = false;

    void fetchRemoteContentDataset(state.authSession?.accessToken)
      .then((dataset) => {
        if (cancelled) {
          return;
        }

        setRemoteContent(contentStateFromDataset(dataset));
      })
      .catch(() => {
        // Keep local demo content when the Java content API is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, state.authSession?.accessToken]);

  useEffect(() => {
    if (!hydrated || !state.authSession?.accessToken) {
      return;
    }

    const currentUser = state.users.find((user) => user.id === state.currentUserId) ?? null;

    if (!userCanManage(currentUser)) {
      return;
    }

    let cancelled = false;

    void fetchRemoteAdminDataset(state.authSession.accessToken)
      .then((dataset) => {
        if (cancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          invites: dataset.invites ?? current.invites,
          users: dataset.users ? mergeRemoteUsers(current.users, dataset.users) : current.users
        }));
        setRemoteAdminUserPage(dataset.userPage);
      })
      .catch(() => {
        // Keep local admin demo data when the admin API is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, state.authSession?.accessToken, state.currentUserId]);

  const value = useMemo<AppStateValue>(() => {
    const currentUser = state.users.find((user) => user.id === state.currentUserId) ?? null;
    const adminUserPage = remoteAdminUserPage ?? makeLocalAdminUserPage(state.users);
    const content = hasRemoteContent(remoteContent)
      ? remoteContent
      : {
          albums: state.albums,
          photos: state.photos,
          posts: state.posts,
          videoCollections: state.videoCollections,
          videos: state.videos
        };

    return {
      users: state.users,
      adminUserPage,
      invites: state.invites,
      posts: content.posts,
      albums: content.albums,
      photos: content.photos,
      videoCollections: content.videoCollections,
      videos: content.videos,
      currentUserId: state.currentUserId,
      currentUser,
      authSession: state.authSession,
      authReady,
      viewer: toViewer(currentUser),
      registerWithInvite(input) {
        const newUserId = `user-${Date.now()}`;
        const result = consumeInviteCode(state.invites, input.inviteCode.trim(), newUserId);

        if (!result.ok) {
          return result;
        }

        const newUser: UserProfile = {
          id: newUserId,
          name: input.name.trim() || input.email.trim(),
          email: input.email.trim(),
          level: result.assignedLevel,
          disabled: false,
          isAdmin: false
        };

        setState((current) => ({
          ...current,
          users: [...current.users, newUser],
          invites: result.invites,
          currentUserId: newUserId
        }));

        return { ok: true, message: "registered" };
      },
      async registerWithPassword(input) {
        try {
          const registered = await registerWithInviteClient({
            displayName: input.name,
            email: input.email,
            inviteCode: input.inviteCode,
            password: input.password
          });
          const session = await loginWithPasswordClient({
            email: input.email,
            password: input.password
          });
          const user = userFromSession(session);

          setState((current) => ({
            ...current,
            currentUserId: registered.userId,
            authSession: sessionFromLogin(session),
            users: upsertUser(current.users, { ...user, id: registered.userId, level: registered.level })
          }));

          return { ok: true, isAdmin: user.isAdmin };
        } catch (error) {
          return {
            ok: false,
            message: error instanceof Error ? error.message : "Registration failed"
          };
        }
      },
      async loginWithPassword(input) {
        try {
          const session = await loginWithPasswordClient(input);
          const user = userFromSession(session);

          setState((current) => ({
            ...current,
            currentUserId: user.id,
            authSession: sessionFromLogin(session),
            users: upsertUser(current.users, user)
          }));

          return { ok: true, isAdmin: user.isAdmin };
        } catch (error) {
          return {
            ok: false,
            message: error instanceof Error ? error.message : "Login failed"
          };
        }
      },
      loginAs(userId) {
        setState((current) => ({ ...current, authSession: null, currentUserId: userId }));
      },
      async logout() {
        if (state.authSession?.accessToken) {
          await logoutClient();
        }
        setRemoteAdminUserPage(null);
        setState((current) => ({ ...current, authSession: null, currentUserId: null }));
      },
      async loadPostsPage(input) {
        try {
          const page = await fetchRemotePostsPage(input);
          setRemoteContent((current) => ({
            ...current,
            posts: mergeById(current.posts, page.items)
          }));
          return page;
        } catch {
          const pageNumber = input.page ?? 0;
          const pageSize = input.size ?? 12;
          const items = content.posts.slice(pageNumber * pageSize, pageNumber * pageSize + pageSize);
          return {
            items,
            page: pageNumber,
            size: pageSize,
            total: content.posts.length,
            totalPages: Math.max(1, Math.ceil(content.posts.length / pageSize))
          };
        }
      },
      async loadAlbumsPage(input) {
        try {
          const page = await fetchRemoteAlbumsPage(input);
          setRemoteContent((current) => ({
            ...current,
            albums: mergeById(current.albums, page.items)
          }));
          return page;
        } catch {
          const pageNumber = input.page ?? 0;
          const pageSize = input.size ?? 12;
          const items = content.albums.slice(pageNumber * pageSize, pageNumber * pageSize + pageSize);
          return {
            items,
            page: pageNumber,
            size: pageSize,
            total: content.albums.length,
            totalPages: Math.max(1, Math.ceil(content.albums.length / pageSize))
          };
        }
      },
      async loadVideosPage(input) {
        try {
          const page = await fetchRemoteVideosPage(input);
          setRemoteContent((current) => ({
            ...current,
            videoCollections: mergeById(current.videoCollections, page.items.map((item) => item.collection)),
            videos: mergeById(current.videos, page.items.map((item) => item.video))
          }));
          return page;
        } catch {
          const pageNumber = input.page ?? 0;
          const pageSize = input.size ?? 12;
          const items = content.videoCollections
            .slice(pageNumber * pageSize, pageNumber * pageSize + pageSize)
            .map((collection) => ({
              collection,
              video: content.videos.find((video) => video.collectionId === collection.id) ?? {
                collectionId: collection.id,
                description: collection.description,
                id: `${collection.id}-empty`,
                mediaAssetId: "",
                playbackUrl: "",
                processingState: "ready" as const,
                sortOrder: 1,
                thumbnailUrl: collection.coverImage,
                title: collection.title,
                visibilityOverride: null
              }
            }));
          return {
            items,
            page: pageNumber,
            size: pageSize,
            total: content.videoCollections.length,
            totalPages: Math.max(1, Math.ceil(content.videoCollections.length / pageSize))
          };
        }
      },
      async loadAdminUsersPage(input) {
        const page = input.page ?? 0;
        const size = input.size ?? adminUserPage.size;
        const query = input.q?.trim().toLowerCase() ?? "";

        if (state.authSession?.accessToken) {
          const nextPage = await fetchRemoteAdminUsers(state.authSession.accessToken, {
            page,
            q: input.q,
            size
          });
          setRemoteAdminUserPage(nextPage);
          setState((current) => ({
            ...current,
            users: mergeRemoteUsers(current.users, nextPage.users)
          }));
          return;
        }

        const filteredUsers = query
          ? state.users.filter((user) =>
              [user.name, user.email, user.level].some((value) => value.toLowerCase().includes(query))
            )
          : state.users;
        setRemoteAdminUserPage(makeLocalAdminUserPage(filteredUsers, page, size));
      },
      updateUserLevel(userId, level) {
        setState((current) => ({
          ...current,
          users: current.users.map((user) => (user.id === userId ? { ...user, level } : user))
        }));
        setRemoteAdminUserPage((current) =>
          current
            ? {
                ...current,
                users: current.users.map((user) => (user.id === userId ? { ...user, level } : user))
              }
            : current
        );

        if (state.authSession?.accessToken) {
          void updateRemoteUser(state.authSession.accessToken, { level: level as InviteTargetLevel, userId }).catch(() => {
            // Keep the optimistic local admin update if production admin updates are unavailable.
          });
        }
      },
      toggleUserDisabled(userId) {
        const targetUser = state.users.find((user) => user.id === userId);
        const nextDisabled = !targetUser?.disabled;

        setState((current) => ({
          ...current,
          users: current.users.map((user) =>
            user.id === userId ? { ...user, disabled: !user.disabled } : user
          )
        }));
        setRemoteAdminUserPage((current) =>
          current
            ? {
                ...current,
                users: current.users.map((user) =>
                  user.id === userId ? { ...user, disabled: nextDisabled } : user
                )
              }
            : current
        );

        if (state.authSession?.accessToken) {
          void updateRemoteUser(state.authSession.accessToken, { disabled: nextDisabled, userId }).catch(() => {
            // Keep the optimistic local admin update if production admin updates are unavailable.
          });
        }
      },
      async generateInvite(level) {
        if (state.authSession?.accessToken) {
          const invite = await createRemoteInvite(state.authSession.accessToken, level as InviteTargetLevel);
          setState((current) => ({ ...current, invites: [invite, ...current.invites] }));
          return invite.code;
        }

        const code = makeInviteCode(level);
        const invite: InviteCode = {
          id: `invite-${Date.now()}`,
          code,
          targetLevel: level,
          usedByUserId: null,
          note: "local demo"
        };
        setState((current) => ({ ...current, invites: [invite, ...current.invites] }));
        return code;
      },
      deleteInvite(inviteId) {
        const invite = state.invites.find((candidate) => candidate.id === inviteId);

        if (invite?.usedByUserId) {
          return;
        }

        setState((current) => ({
          ...current,
          invites: current.invites.filter((candidate) => candidate.id !== inviteId)
        }));

        if (state.authSession?.accessToken) {
          void deleteRemoteInvite(state.authSession.accessToken, inviteId).catch(() => {
            // Keep the optimistic local admin update if production admin updates are unavailable.
          });
        }
      },
      async publishPost(input) {
        const id = `post-${Date.now()}`;
        const post: PostRecord = {
          id,
          type: "post",
          title: input.title.trim() || "未命名动态",
          excerpt: input.body.trim().slice(0, 120) || input.title.trim() || "动态正文",
          body: input.body,
          coverImage:
            input.coverImage ||
            "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80",
          visibility: input.visibility,
          publishedAt: new Date().toISOString().slice(0, 10)
        };

        if (state.authSession?.accessToken) {
          const result = await publishRemoteContent(state.authSession.accessToken, {
            body: post.body,
            coverImage: post.coverImage,
            kind: "post",
            mediaAssetId: input.mediaAssetId || mediaIdFromAccessUrl(post.coverImage),
            title: post.title,
            visibility: post.visibility
          });
          if ("post" in result) {
            setRemoteContent((current) => ({
              ...current,
              posts: [result.post, ...current.posts.filter((currentPost) => currentPost.id !== id)]
            }));
          }
          return;
        }

        setState((current) => ({ ...current, posts: [post, ...current.posts] }));
      },
      async createAlbumWithPhoto(input) {
        const timestamp = Date.now();
        const albumId = `album-${timestamp}`;
        const album: AlbumRecord = {
          id: albumId,
          title: input.title.trim() || "未命名相册",
          description: input.description.trim() || "相册描述",
          coverImage:
            input.imageUrl ||
            "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
          defaultVisibility: input.visibility,
          publishedAt: new Date().toISOString().slice(0, 10)
        };
        const photo: PhotoRecord = {
          id: `photo-${timestamp}`,
          albumId,
          title: input.photoTitle.trim() || album.title,
          imageUrl: album.coverImage,
          visibilityOverride: null,
          sortOrder: 1
        };

        if (state.authSession?.accessToken) {
          const result = await publishRemoteContent(state.authSession.accessToken, {
            description: album.description,
            imageUrl: photo.imageUrl,
            kind: "album",
            mediaAssetId: input.mediaAssetId,
            photoTitle: photo.title,
            title: album.title,
            visibility: album.defaultVisibility
          });
          if ("album" in result) {
            setRemoteContent((current) => ({
              ...current,
              albums: [result.album, ...current.albums.filter((currentAlbum) => currentAlbum.id !== albumId)],
              photos: [
                result.photo,
                ...current.photos.filter((currentPhoto) => currentPhoto.albumId !== albumId)
              ]
            }));
          }
          return;
        }

        setState((current) => ({
          ...current,
          albums: [album, ...current.albums],
          photos: [photo, ...current.photos]
        }));
      },
      async createVideoCollectionWithVideo(input) {
        const timestamp = Date.now();
        const collectionId = `video-collection-${timestamp}`;
        const playbackUrl = input.playbackUrl || "";
        const thumbnailUrl =
          input.thumbnailUrl || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80";
        const collection: VideoCollectionRecord = {
          id: collectionId,
          title: input.title.trim() || "未命名视频",
          description: input.description.trim() || "视频简介",
          coverImage: thumbnailUrl,
          defaultVisibility: input.visibility,
          publishedAt: new Date().toISOString().slice(0, 10)
        };
        const video: VideoRecord = {
          id: `video-${timestamp}`,
          collectionId,
          title: input.videoTitle.trim() || collection.title,
          description: collection.description,
          mediaAssetId: input.mediaAssetId || `local/${timestamp}`,
          playbackUrl,
          thumbnailUrl,
          visibilityOverride: null,
          processingState: "ready",
          sortOrder: 1
        };

        if (state.authSession?.accessToken) {
          const result = await publishRemoteContent(state.authSession.accessToken, {
            mediaAssetId: video.mediaAssetId,
            description: collection.description,
            kind: "video",
            playbackUrl: video.playbackUrl,
            coverMediaId: input.coverMediaId,
            thumbnailUrl: video.thumbnailUrl,
            title: collection.title,
            videoTitle: video.title,
            visibility: collection.defaultVisibility
          });
          if ("collection" in result) {
            setRemoteContent((current) => ({
              ...current,
              videoCollections: [
                result.collection,
                ...current.videoCollections.filter((currentCollection) => currentCollection.id !== collectionId)
              ],
              videos: [
                result.video,
                ...current.videos.filter((currentVideo) => currentVideo.collectionId !== collectionId)
              ]
            }));
          }
          return;
        }

        setState((current) => ({
          ...current,
          videoCollections: [collection, ...current.videoCollections],
          videos: [video, ...current.videos]
        }));
      },
      async updatePost(input) {
        const updatedPost = {
          body: input.body,
          coverImage: input.coverImage || "",
          excerpt: shortExcerpt(input.body, input.title),
          id: input.id,
          title: input.title.trim() || "未命名动态",
          visibility: input.visibility
        };

        setState((current) => ({
          ...current,
          posts: current.posts.map((post) => (post.id === input.id ? { ...post, ...updatedPost } : post))
        }));

        if (state.authSession?.accessToken) {
          await updateRemoteContent(state.authSession.accessToken, {
            body: updatedPost.body,
            coverImage: updatedPost.coverImage,
            id: updatedPost.id,
            kind: "post",
            mediaAssetId: input.mediaAssetId || mediaIdFromAccessUrl(updatedPost.coverImage),
            title: updatedPost.title,
            visibility: updatedPost.visibility
          });
          setRemoteContent((current) => ({
            ...current,
            posts: current.posts.map((post) => (post.id === input.id ? { ...post, ...updatedPost } : post))
          }));
        }
      },
      async updateAlbum(input) {
        const updatedAlbum = {
          coverImage: input.coverImage || "",
          defaultVisibility: input.defaultVisibility,
          description: input.description,
          id: input.id,
          title: input.title.trim() || "未命名相册"
        };

        setState((current) => ({
          ...current,
          albums: current.albums.map((album) => (album.id === input.id ? { ...album, ...updatedAlbum } : album))
        }));

        if (state.authSession?.accessToken) {
          await updateRemoteContent(state.authSession.accessToken, {
            coverImage: updatedAlbum.coverImage,
            coverMediaId: input.coverMediaId || mediaIdFromAccessUrl(updatedAlbum.coverImage),
            defaultVisibility: updatedAlbum.defaultVisibility,
            description: updatedAlbum.description,
            id: updatedAlbum.id,
            kind: "album",
            title: updatedAlbum.title
          });
          setRemoteContent((current) => ({
            ...current,
            albums: current.albums.map((album) =>
              album.id === input.id ? { ...album, ...updatedAlbum } : album
            )
          }));
        }
      },
      async updateVideoCollection(input) {
        const updatedCollection = {
          coverImage: input.coverImage || "",
          defaultVisibility: input.defaultVisibility,
          description: input.description,
          id: input.id,
          title: input.title.trim() || "未命名视频"
        };

        setState((current) => ({
          ...current,
          videoCollections: current.videoCollections.map((collection) =>
            collection.id === input.id ? { ...collection, ...updatedCollection } : collection
          )
        }));

        if (state.authSession?.accessToken) {
          await updateRemoteContent(state.authSession.accessToken, {
            coverImage: updatedCollection.coverImage,
            coverMediaId: input.coverMediaId || mediaIdFromAccessUrl(updatedCollection.coverImage),
            defaultVisibility: updatedCollection.defaultVisibility,
            description: updatedCollection.description,
            id: updatedCollection.id,
            kind: "video",
            title: updatedCollection.title
          });
          setRemoteContent((current) => ({
            ...current,
            videoCollections: current.videoCollections.map((collection) =>
              collection.id === input.id ? { ...collection, ...updatedCollection } : collection
            )
          }));
        }
      },
      async deleteContent(input) {
        setState((current) => {
          if (input.kind === "post") {
            return {
              ...current,
              posts: current.posts.filter((post) => post.id !== input.id)
            };
          }

          if (input.kind === "album") {
            return {
              ...current,
              albums: current.albums.filter((album) => album.id !== input.id),
              photos: current.photos.filter((photo) => photo.albumId !== input.id)
            };
          }

          return {
            ...current,
            videoCollections: current.videoCollections.filter((collection) => collection.id !== input.id),
            videos: current.videos.filter((video) => video.collectionId !== input.id)
          };
        });

        if (state.authSession?.accessToken) {
          await deleteRemoteContent(state.authSession.accessToken, input);
          setRemoteContent((current) => {
            if (input.kind === "post") {
              return {
                ...current,
                posts: current.posts.filter((post) => post.id !== input.id)
              };
            }

            if (input.kind === "album") {
              return {
                ...current,
                albums: current.albums.filter((album) => album.id !== input.id),
                photos: current.photos.filter((photo) => photo.albumId !== input.id)
              };
            }

            return {
              ...current,
              videoCollections: current.videoCollections.filter((collection) => collection.id !== input.id),
              videos: current.videos.filter((video) => video.collectionId !== input.id)
            };
          });
        }
      }
    };
  }, [authReady, remoteContent, state]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used inside AppStateProvider");
  }
  return context;
}
