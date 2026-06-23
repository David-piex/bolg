"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useCallback,
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
  type RemoteContentPage,
  type RemoteContentPageInput
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
import { getSiteSettings, updateSiteSettings as updateRemoteSiteSettings, registerUnauthenticatedListener, type JavaSiteSettings } from "@/services/java-api-client";
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
  type ContentRecordStatus,
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
  siteSettings: JavaSiteSettings;
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
  loadAlbumsPage: (input: RemoteContentPageInput) => Promise<RemoteContentPage<AlbumRecord>>;
  loadAdminUsersPage: (input: { page?: number; q?: string; size?: number }) => Promise<void>;
  loadPostsPage: (input: RemoteContentPageInput) => Promise<RemoteContentPage<PostRecord>>;
  loadVideosPage: (input: RemoteContentPageInput) => Promise<
    RemoteContentPage<{ collection: VideoCollectionRecord; video: VideoRecord }>
  >;
  updateUserLevel: (userId: string, level: Exclude<MembershipLevel, "public">) => void;
  toggleUserDisabled: (userId: string) => void;
  updateSiteSettings: (input: { siteName: string; logoText: string; logoMark: string }) => Promise<void>;
  generateInvite: (level: Exclude<MembershipLevel, "public">, expiresAt?: string | null) => Promise<string>;
  deleteInvite: (inviteId: string) => void;
  publishPost: (input: {
    title: string;
    body: string;
    category?: string;
    tags?: string[];
    visibility: MembershipLevel;
    status?: ContentRecordStatus;
    scheduledAt?: string;
    coverImage?: string;
    mediaAssetId?: string;
    pinned?: boolean;
  }) => Promise<void>;
  createAlbumWithPhoto: (input: {
    title: string;
    description: string;
    category?: string;
    tags?: string[];
    visibility: MembershipLevel;
    photoTitle: string;
    status?: ContentRecordStatus;
    scheduledAt?: string;
    imageUrl?: string;
    mediaAssetId?: string;
  }) => Promise<void>;
  createVideoCollectionWithVideo: (input: {
    title: string;
    description: string;
    category?: string;
    tags?: string[];
    visibility: MembershipLevel;
    videoTitle: string;
    status?: ContentRecordStatus;
    scheduledAt?: string;
    playbackUrl?: string;
    mediaAssetId?: string;
    coverMediaId?: string;
    thumbnailUrl?: string;
  }) => Promise<void>;
  updatePost: (input: {
    id: string;
    title: string;
    body: string;
    category?: string;
    tags?: string[];
    visibility: MembershipLevel;
    status?: ContentRecordStatus;
    scheduledAt?: string;
    coverImage?: string;
    mediaAssetId?: string;
    pinned?: boolean;
  }) => Promise<void>;
  updateAlbum: (input: {
    id: string;
    title: string;
    description: string;
    category?: string;
    tags?: string[];
    defaultVisibility: MembershipLevel;
    status?: ContentRecordStatus;
    scheduledAt?: string;
    coverImage?: string;
    coverMediaId?: string;
  }) => Promise<void>;
  updateVideoCollection: (input: {
    id: string;
    title: string;
    description: string;
    category?: string;
    tags?: string[];
    defaultVisibility: MembershipLevel;
    status?: ContentRecordStatus;
    scheduledAt?: string;
    coverImage?: string;
    coverMediaId?: string;
  }) => Promise<void>;
  deleteContent: (input: { kind: "post" | "album" | "video"; id: string }) => Promise<void>;
};

type AppAuthState = {
  authReady: boolean;
  authSession: AuthSession | null;
  currentUser: UserProfile | null;
  currentUserId: string | null;
  loginAs: (userId: string | null) => void;
  loginWithPassword: (input: { email: string; password: string }) => Promise<RemoteAuthResult>;
  logout: () => Promise<void>;
  registerWithInvite: (input: { name: string; email: string; inviteCode: string }) => RegisterResult;
  registerWithPassword: (input: { name: string; email: string; inviteCode: string; password: string }) => Promise<RemoteAuthResult>;
  viewer: Viewer;
};

type AppContentState = {
  albums: AlbumRecord[];
  loadAlbumsPage: (input: RemoteContentPageInput) => Promise<RemoteContentPage<AlbumRecord>>;
  loadPostsPage: (input: RemoteContentPageInput) => Promise<RemoteContentPage<PostRecord>>;
  loadVideosPage: (input: RemoteContentPageInput) => Promise<
    RemoteContentPage<{ collection: VideoCollectionRecord; video: VideoRecord }>
  >;
  photos: PhotoRecord[];
  posts: PostRecord[];
  videoCollections: VideoCollectionRecord[];
  videos: VideoRecord[];
};

type AppSiteState = {
  siteSettings: JavaSiteSettings;
};

type AppAdminState = {
  adminUserPage: AdminUserPage;
  albums: AlbumRecord[];
  authReady: boolean;
  authSession: AuthSession | null;
  createAlbumWithPhoto: AppStateValue["createAlbumWithPhoto"];
  createVideoCollectionWithVideo: AppStateValue["createVideoCollectionWithVideo"];
  currentUser: UserProfile | null;
  deleteContent: AppStateValue["deleteContent"];
  deleteInvite: AppStateValue["deleteInvite"];
  generateInvite: AppStateValue["generateInvite"];
  invites: InviteCode[];
  loadAdminUsersPage: AppStateValue["loadAdminUsersPage"];
  photos: PhotoRecord[];
  posts: PostRecord[];
  publishPost: AppStateValue["publishPost"];
  siteSettings: JavaSiteSettings;
  toggleUserDisabled: AppStateValue["toggleUserDisabled"];
  updateAlbum: AppStateValue["updateAlbum"];
  updatePost: AppStateValue["updatePost"];
  updateSiteSettings: AppStateValue["updateSiteSettings"];
  updateUserLevel: AppStateValue["updateUserLevel"];
  updateVideoCollection: AppStateValue["updateVideoCollection"];
  users: UserProfile[];
  videoCollections: VideoCollectionRecord[];
  videos: VideoRecord[];
};

type AppAdminActions = Pick<
  AppAdminState,
  | "createAlbumWithPhoto"
  | "createVideoCollectionWithVideo"
  | "deleteContent"
  | "deleteInvite"
  | "generateInvite"
  | "loadAdminUsersPage"
  | "publishPost"
  | "toggleUserDisabled"
  | "updateAlbum"
  | "updatePost"
  | "updateSiteSettings"
  | "updateUserLevel"
  | "updateVideoCollection"
>;

const storageKey = "media-gate-state-v1";
const persistDebounceMs = 300;
const remoteContentLoadDelayMs = 120;
const defaultSiteSettings: JavaSiteSettings = {
  logoMark: "绫",
  logoText: "绫奈",
  siteName: "绫奈空间",
  updatedAt: new Date(0).toISOString()
};

const AppStateContext = createContext<AppStateValue | null>(null);
const AppAuthStateContext = createContext<AppAuthState | null>(null);
const AppAdminStateContext = createContext<AppAdminState | null>(null);
const AppContentStateContext = createContext<AppContentState | null>(null);
const AppSiteStateContext = createContext<AppSiteState | null>(null);

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
  siteSettings: JavaSiteSettings;
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
      siteSettings: {
        logoMark: "绫",
        logoText: "绫奈",
        siteName: "绫奈",
        updatedAt: new Date(0).toISOString()
      },
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
    siteSettings: {
      logoMark: "绫",
      logoText: "绫奈",
      siteName: "绫奈",
      updatedAt: new Date(0).toISOString()
    },
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
    siteSettings: saved.siteSettings ?? initial.siteSettings,
    currentUserId: saved.currentUserId ?? initial.currentUserId,
    authSession: null
  };
}

function normalizeSiteSettings(input: Partial<JavaSiteSettings> | null | undefined): JavaSiteSettings {
  return {
    logoMark: input?.logoMark?.trim() || defaultSiteSettings.logoMark,
    logoText: input?.logoText?.trim() || defaultSiteSettings.logoText,
    siteName: input?.siteName?.trim() || defaultSiteSettings.siteName,
    updatedAt: input?.updatedAt || defaultSiteSettings.updatedAt
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

function contentStatus(input?: ContentRecordStatus): ContentRecordStatus {
  return input ?? "published";
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function publishedDateFor(status: ContentRecordStatus, current?: string): string {
  if (status === "draft" || status === "scheduled") {
    return "";
  }

  return current || todayDate();
}

function scheduledDateFor(status: ContentRecordStatus, scheduledAt?: string): string {
  return status === "scheduled" ? (scheduledAt || todayDate()) : "";
}

function isPublishedContent(record: { status?: ContentRecordStatus }): boolean {
  return (record.status ?? "published") === "published";
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

function makeLocalContentPage<T>(
  items: T[],
  input: RemoteContentPageInput,
  searchableText: (item: T) => string
): RemoteContentPage<T> {
  const pageSize = Math.max(1, input.size ?? 12);
  const query = input.q?.trim().toLowerCase() ?? "";
  const category = input.category?.trim().toLowerCase() ?? "";
  const tag = input.tag?.trim().toLowerCase() ?? "";
  const filteredItems = items
    .filter((item) => !query || searchableText(item).toLowerCase().includes(query))
    .filter((item) => !category || taxonomyFor(item).category.toLowerCase() === category)
    .filter((item) => !tag || taxonomyFor(item).tags.some((itemTag) => itemTag.toLowerCase() === tag));
  const sortedItems = [...filteredItems].sort((left, right) => compareContentItems(left, right, input.sort));
  const total = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageNumber = Math.min(Math.max(input.page ?? 0, 0), totalPages - 1);
  const start = pageNumber * pageSize;

  return {
    items: sortedItems.slice(start, start + pageSize),
    page: pageNumber,
    size: pageSize,
    total,
    totalPages
  };
}

function compareContentItems<T>(left: T, right: T, sort: RemoteContentPageInput["sort"]): number {
  const leftRecord = left as { pinned?: boolean; publishedAt?: string; title?: string };
  const rightRecord = right as { pinned?: boolean; publishedAt?: string; title?: string };
  const pinnedComparison = Number(Boolean(rightRecord.pinned)) - Number(Boolean(leftRecord.pinned));

  if (pinnedComparison !== 0) {
    return pinnedComparison;
  }

  if (sort === "oldest") {
    return (leftRecord.publishedAt ?? "").localeCompare(rightRecord.publishedAt ?? "")
      || (leftRecord.title ?? "").localeCompare(rightRecord.title ?? "");
  }

  if (sort === "title") {
    return (leftRecord.title ?? "").localeCompare(rightRecord.title ?? "")
      || (rightRecord.publishedAt ?? "").localeCompare(leftRecord.publishedAt ?? "");
  }

  return (rightRecord.publishedAt ?? "").localeCompare(leftRecord.publishedAt ?? "")
    || (leftRecord.title ?? "").localeCompare(rightRecord.title ?? "");
}

function taxonomyFor(item: unknown): { category: string; tags: string[] } {
  const record = item as { category?: string; tags?: string[] };
  return {
    category: record.category ?? "",
    tags: Array.isArray(record.tags) ? record.tags : []
  };
}

function normalizeCategory(value?: string): string {
  return value?.trim() ?? "";
}

function normalizeTags(value?: string[]): string[] {
  return Array.from(new Set((value ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean)));
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

export function AppStateProvider({
  children,
  initialContent
}: {
  children: ReactNode;
  initialContent?: ContentDataset;
}) {
  const [state, setState] = useState<PersistedState>(createInitialState);
  const [remoteContent, setRemoteContent] = useState<ContentState>(
    initialContent ? contentStateFromDataset(initialContent) : emptyContentState
  );
  const [remoteAdminUserPage, setRemoteAdminUserPage] = useState<AdminUserPage | null>(null);
  const [remoteSiteSettings, setRemoteSiteSettings] = useState<JavaSiteSettings | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const lastPersistedStateRef = useRef<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      lastPersistedStateRef.current = saved;
      setState(hydrateState(JSON.parse(saved) as Partial<PersistedState>));
    }
    setHydrated(true);

    registerUnauthenticatedListener(() => {
      setState((current) => {
        if (current.authSession || current.currentUserId) {
          return {
            ...current,
            authSession: null,
            currentUserId: null
          };
        }
        return current;
      });
      setRemoteAdminUserPage(null);
    });
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
      .catch((error) => {
        if (cancelled) {
          return;
        }
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

    const timer = window.setTimeout(() => {
      const stateToPersist = {
        ...state,
        authSession: null
      };
      const serialized = JSON.stringify(stateToPersist);
      if (serialized === lastPersistedStateRef.current) {
        return;
      }

      window.localStorage.setItem(storageKey, serialized);
      lastPersistedStateRef.current = serialized;
    }, persistDebounceMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hydrated, state]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
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
    }, remoteContentLoadDelayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
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

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void getSiteSettings()
        .then((settings) => {
          if (!cancelled) {
            setRemoteSiteSettings(normalizeSiteSettings(settings));
          }
        })
        .catch(() => {
          // Keep local site settings when the admin API is unavailable.
        });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [hydrated]);

  const stateRef = useRef(state);
  stateRef.current = state;
  const remoteContentRef = useRef(remoteContent);
  remoteContentRef.current = remoteContent;
  const authSessionRef = useRef(state.authSession);
  authSessionRef.current = state.authSession;

  const getActiveContent = useCallback((): ContentState => {
    const currentRemote = remoteContentRef.current;
    if (hasRemoteContent(currentRemote)) {
      return currentRemote;
    }

    const currentState = stateRef.current;
    return {
      albums: currentState.albums,
      photos: currentState.photos,
      posts: currentState.posts,
      videoCollections: currentState.videoCollections,
      videos: currentState.videos
    };
  }, []);

  const registerWithInvite = useCallback<AppAuthState["registerWithInvite"]>((input) => {
    const newUserId = `user-${Date.now()}`;
    const result = consumeInviteCode(stateRef.current.invites, input.inviteCode.trim(), newUserId);

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
  }, []);

  const registerWithPassword = useCallback<AppAuthState["registerWithPassword"]>(async (input) => {
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
  }, []);

  const loginWithPassword = useCallback<AppAuthState["loginWithPassword"]>(async (input) => {
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
  }, []);

  const loginAs = useCallback<AppAuthState["loginAs"]>((userId) => {
    setState((current) => ({ ...current, authSession: null, currentUserId: userId }));
  }, []);

  const logout = useCallback<AppAuthState["logout"]>(async () => {
    if (authSessionRef.current?.accessToken) {
      await logoutClient();
    }
    setRemoteAdminUserPage(null);
    setState((current) => ({ ...current, authSession: null, currentUserId: null }));
  }, []);

  const loadPostsPage = useCallback<AppContentState["loadPostsPage"]>(async (input) => {
    try {
      const page = await fetchRemotePostsPage(input);
      setRemoteContent((current) => ({
        ...current,
        posts: mergeById(current.posts, page.items)
      }));
      return page;
    } catch {
      const content = getActiveContent();
      return makeLocalContentPage(
        content.posts.filter(isPublishedContent),
        input,
        (post) => `${post.title} ${post.excerpt} ${post.body} ${post.category} ${post.tags.join(" ")}`
      );
    }
  }, [getActiveContent]);

  const loadAlbumsPage = useCallback<AppContentState["loadAlbumsPage"]>(async (input) => {
    try {
      const page = await fetchRemoteAlbumsPage(input);
      setRemoteContent((current) => ({
        ...current,
        albums: mergeById(current.albums, page.items)
      }));
      return page;
    } catch {
      const content = getActiveContent();
      return makeLocalContentPage(
        content.albums.filter(isPublishedContent),
        input,
        (album) => `${album.title} ${album.description} ${album.category} ${album.tags.join(" ")}`
      );
    }
  }, [getActiveContent]);

  const loadVideosPage = useCallback<AppContentState["loadVideosPage"]>(async (input) => {
    try {
      const page = await fetchRemoteVideosPage(input);
      setRemoteContent((current) => ({
        ...current,
        videoCollections: mergeById(current.videoCollections, page.items.map((item) => item.collection)),
        videos: mergeById(current.videos, page.items.map((item) => item.video))
      }));
      return page;
    } catch {
      const content = getActiveContent();
      const page = makeLocalContentPage(
        content.videoCollections.filter(isPublishedContent),
        input,
        (collection) => `${collection.title} ${collection.description} ${collection.category} ${collection.tags.join(" ")}`
      );
      const items = page.items.map((collection) => ({
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
        page: page.page,
        size: page.size,
        total: page.total,
        totalPages: page.totalPages
      };
    }
  }, [getActiveContent]);

  const value = useMemo<AppStateValue>(() => {
    const currentUser = state.users.find((user) => user.id === state.currentUserId) ?? null;
    const adminUserPage = remoteAdminUserPage ?? makeLocalAdminUserPage(state.users);
    const siteSettings = normalizeSiteSettings(remoteSiteSettings ?? state.siteSettings);
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
      siteSettings,
      currentUserId: state.currentUserId,
      currentUser,
      authSession: state.authSession,
      authReady,
      viewer: toViewer(currentUser),
      registerWithInvite,
      registerWithPassword,
      loginWithPassword,
      loginAs,
      logout,
      loadPostsPage,
      loadAlbumsPage,
      loadVideosPage,
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
      async updateSiteSettings(input) {
        const nextSettings = normalizeSiteSettings({
          logoMark: input.logoMark.trim(),
          logoText: input.logoText.trim(),
          siteName: input.siteName.trim(),
          updatedAt: new Date().toISOString()
        });

        setState((current) => ({
          ...current,
          siteSettings: nextSettings
        }));
        setRemoteSiteSettings(nextSettings);

        if (state.authSession?.accessToken) {
          await updateRemoteSiteSettings(nextSettings).catch(() => {
            // Keep the optimistic local update if production site settings are unavailable.
          });
        }
      },
      async generateInvite(level, expiresAt) {
        if (state.authSession?.accessToken) {
          const invite = await createRemoteInvite(
            state.authSession.accessToken,
            level as InviteTargetLevel,
            expiresAt
          );
          setState((current) => ({ ...current, invites: [invite, ...current.invites] }));
          return invite.code;
        }

        const code = makeInviteCode(level);
        const invite: InviteCode = {
          id: `invite-${Date.now()}`,
          code,
          expiresAt: expiresAt ?? null,
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
        const nextStatus = contentStatus(input.status);
        const post: PostRecord = {
          id,
          type: "post",
          title: input.title.trim() || "未命名动态",
          excerpt: input.body.trim().slice(0, 120) || input.title.trim() || "动态正文",
          body: input.body,
          category: normalizeCategory(input.category),
          coverImage:
            input.coverImage ||
            "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80",
          pinned: Boolean(input.pinned),
          status: nextStatus,
          scheduledAt: scheduledDateFor(nextStatus, input.scheduledAt),
          tags: normalizeTags(input.tags),
          visibility: input.visibility,
          publishedAt: publishedDateFor(nextStatus)
        };

        if (state.authSession?.accessToken) {
          const result = await publishRemoteContent(state.authSession.accessToken, {
            body: post.body,
            category: post.category,
            coverImage: post.coverImage,
            kind: "post",
            mediaAssetId: input.mediaAssetId || mediaIdFromAccessUrl(post.coverImage),
            pinned: post.pinned,
            status: post.status,
            scheduledAt: post.scheduledAt,
            tags: post.tags,
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
        const nextStatus = contentStatus(input.status);
        const album: AlbumRecord = {
          id: albumId,
          title: input.title.trim() || "未命名相册",
          description: input.description.trim() || "相册描述",
          category: normalizeCategory(input.category),
          coverImage:
            input.imageUrl ||
            "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
          defaultVisibility: input.visibility,
          status: nextStatus,
          scheduledAt: scheduledDateFor(nextStatus, input.scheduledAt),
          tags: normalizeTags(input.tags),
          publishedAt: publishedDateFor(nextStatus)
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
            category: album.category,
            description: album.description,
            imageUrl: photo.imageUrl,
            kind: "album",
            mediaAssetId: input.mediaAssetId,
            photoTitle: photo.title,
            status: album.status,
            scheduledAt: album.scheduledAt,
            tags: album.tags,
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
        const nextStatus = contentStatus(input.status);
        const playbackUrl = input.playbackUrl || "";
        const thumbnailUrl =
          input.thumbnailUrl || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80";
        const collection: VideoCollectionRecord = {
          id: collectionId,
          title: input.title.trim() || "未命名视频",
          description: input.description.trim() || "视频简介",
          category: normalizeCategory(input.category),
          coverImage: thumbnailUrl,
          defaultVisibility: input.visibility,
          status: nextStatus,
          scheduledAt: scheduledDateFor(nextStatus, input.scheduledAt),
          tags: normalizeTags(input.tags),
          publishedAt: publishedDateFor(nextStatus)
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
            category: collection.category,
            description: collection.description,
            kind: "video",
            playbackUrl: video.playbackUrl,
            coverMediaId: input.coverMediaId,
            thumbnailUrl: video.thumbnailUrl,
            status: collection.status,
            scheduledAt: collection.scheduledAt,
            tags: collection.tags,
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
        const existingPost = content.posts.find((post) => post.id === input.id);
        const nextStatus = contentStatus(input.status ?? existingPost?.status);
        const updatedPost = {
          body: input.body,
          category: normalizeCategory(input.category ?? existingPost?.category),
          coverImage: input.coverImage || "",
          excerpt: shortExcerpt(input.body, input.title),
          id: input.id,
          ...(input.pinned !== undefined ? { pinned: input.pinned } : {}),
          publishedAt: publishedDateFor(nextStatus, existingPost?.publishedAt),
          scheduledAt: scheduledDateFor(nextStatus, input.scheduledAt ?? existingPost?.scheduledAt),
          status: nextStatus,
          tags: normalizeTags(input.tags ?? existingPost?.tags),
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
            category: updatedPost.category,
            coverImage: updatedPost.coverImage,
            id: updatedPost.id,
            kind: "post",
            mediaAssetId: input.mediaAssetId || mediaIdFromAccessUrl(updatedPost.coverImage),
            pinned: input.pinned,
            status: updatedPost.status,
            scheduledAt: updatedPost.scheduledAt,
            tags: updatedPost.tags,
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
        const existingAlbum = content.albums.find((album) => album.id === input.id);
        const nextStatus = contentStatus(input.status ?? existingAlbum?.status);
        const updatedAlbum = {
          category: normalizeCategory(input.category ?? existingAlbum?.category),
          coverImage: input.coverImage || "",
          defaultVisibility: input.defaultVisibility,
          description: input.description,
          id: input.id,
          publishedAt: publishedDateFor(nextStatus, existingAlbum?.publishedAt),
          scheduledAt: scheduledDateFor(nextStatus, input.scheduledAt ?? existingAlbum?.scheduledAt),
          status: nextStatus,
          tags: normalizeTags(input.tags ?? existingAlbum?.tags),
          title: input.title.trim() || "未命名相册"
        };

        setState((current) => ({
          ...current,
          albums: current.albums.map((album) => (album.id === input.id ? { ...album, ...updatedAlbum } : album))
        }));

        if (state.authSession?.accessToken) {
          await updateRemoteContent(state.authSession.accessToken, {
            category: updatedAlbum.category,
            coverImage: updatedAlbum.coverImage,
            coverMediaId: input.coverMediaId || mediaIdFromAccessUrl(updatedAlbum.coverImage),
            defaultVisibility: updatedAlbum.defaultVisibility,
            description: updatedAlbum.description,
            id: updatedAlbum.id,
            kind: "album",
            status: updatedAlbum.status,
            scheduledAt: updatedAlbum.scheduledAt,
            tags: updatedAlbum.tags,
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
        const existingCollection = content.videoCollections.find((collection) => collection.id === input.id);
        const nextStatus = contentStatus(input.status ?? existingCollection?.status);
        const updatedCollection = {
          category: normalizeCategory(input.category ?? existingCollection?.category),
          coverImage: input.coverImage || "",
          defaultVisibility: input.defaultVisibility,
          description: input.description,
          id: input.id,
          publishedAt: publishedDateFor(nextStatus, existingCollection?.publishedAt),
          scheduledAt: scheduledDateFor(nextStatus, input.scheduledAt ?? existingCollection?.scheduledAt),
          status: nextStatus,
          tags: normalizeTags(input.tags ?? existingCollection?.tags),
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
            category: updatedCollection.category,
            coverImage: updatedCollection.coverImage,
            coverMediaId: input.coverMediaId || mediaIdFromAccessUrl(updatedCollection.coverImage),
            defaultVisibility: updatedCollection.defaultVisibility,
            description: updatedCollection.description,
            id: updatedCollection.id,
            kind: "video",
            status: updatedCollection.status,
            scheduledAt: updatedCollection.scheduledAt,
            tags: updatedCollection.tags,
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

  const currentUser = state.users.find((user) => user.id === state.currentUserId) ?? null;
  const authState = useMemo<AppAuthState>(
    () => ({
      authReady,
      authSession: state.authSession,
      currentUser,
      currentUserId: state.currentUserId,
      loginAs,
      loginWithPassword,
      logout,
      registerWithInvite,
      registerWithPassword,
      viewer: toViewer(currentUser)
    }),
    [
      authReady,
      currentUser,
      loginAs,
      loginWithPassword,
      logout,
      registerWithInvite,
      registerWithPassword,
      state.authSession,
      state.currentUserId
    ]
  );
  const contentState = useMemo<AppContentState>(
    () => {
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
        ...content,
        loadAlbumsPage,
        loadPostsPage,
        loadVideosPage
      };
    },
    [
      loadAlbumsPage,
      loadPostsPage,
      loadVideosPage,
      remoteContent,
      state.albums,
      state.photos,
      state.posts,
      state.videoCollections,
      state.videos
    ]
  );
  const siteState = useMemo<AppSiteState>(
    () => ({
      siteSettings: normalizeSiteSettings(remoteSiteSettings ?? state.siteSettings)
    }),
    [remoteSiteSettings, state.siteSettings]
  );
  const appValueRef = useRef(value);
  appValueRef.current = value;
  const adminActions = useMemo<AppAdminActions>(() => {
    const currentValue = () => appValueRef.current;

    return {
      createAlbumWithPhoto: (input) => currentValue().createAlbumWithPhoto(input),
      createVideoCollectionWithVideo: (input) => currentValue().createVideoCollectionWithVideo(input),
      deleteContent: (input) => currentValue().deleteContent(input),
      deleteInvite: (inviteId) => currentValue().deleteInvite(inviteId),
      generateInvite: (level, expiresAt) => currentValue().generateInvite(level, expiresAt),
      loadAdminUsersPage: (input) => currentValue().loadAdminUsersPage(input),
      publishPost: (input) => currentValue().publishPost(input),
      toggleUserDisabled: (userId) => currentValue().toggleUserDisabled(userId),
      updateAlbum: (input) => currentValue().updateAlbum(input),
      updatePost: (input) => currentValue().updatePost(input),
      updateSiteSettings: (input) => currentValue().updateSiteSettings(input),
      updateUserLevel: (userId, level) => currentValue().updateUserLevel(userId, level),
      updateVideoCollection: (input) => currentValue().updateVideoCollection(input)
    };
  }, []);
  const adminState = useMemo<AppAdminState>(
    () => ({
      adminUserPage: value.adminUserPage,
      albums: value.albums,
      authReady: value.authReady,
      authSession: value.authSession,
      createAlbumWithPhoto: adminActions.createAlbumWithPhoto,
      createVideoCollectionWithVideo: adminActions.createVideoCollectionWithVideo,
      currentUser: value.currentUser,
      deleteContent: adminActions.deleteContent,
      deleteInvite: adminActions.deleteInvite,
      generateInvite: adminActions.generateInvite,
      invites: value.invites,
      loadAdminUsersPage: adminActions.loadAdminUsersPage,
      photos: value.photos,
      posts: value.posts,
      publishPost: adminActions.publishPost,
      siteSettings: value.siteSettings,
      toggleUserDisabled: adminActions.toggleUserDisabled,
      updateAlbum: adminActions.updateAlbum,
      updatePost: adminActions.updatePost,
      updateSiteSettings: adminActions.updateSiteSettings,
      updateUserLevel: adminActions.updateUserLevel,
      updateVideoCollection: adminActions.updateVideoCollection,
      users: value.users,
      videoCollections: value.videoCollections,
      videos: value.videos
    }),
    [
      adminActions,
      value.adminUserPage,
      value.albums,
      value.authReady,
      value.authSession,
      value.currentUser,
      value.invites,
      value.photos,
      value.posts,
      value.siteSettings,
      value.users,
      value.videoCollections,
      value.videos
    ]
  );

  return (
    <AppStateContext.Provider value={value}>
      <AppAuthStateContext.Provider value={authState}>
        <AppAdminStateContext.Provider value={adminState}>
          <AppContentStateContext.Provider value={contentState}>
            <AppSiteStateContext.Provider value={siteState}>{children}</AppSiteStateContext.Provider>
          </AppContentStateContext.Provider>
        </AppAdminStateContext.Provider>
      </AppAuthStateContext.Provider>
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateValue {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used inside AppStateProvider");
  }
  return context;
}

export function useAppAuthState(): AppAuthState {
  const context = useContext(AppAuthStateContext);
  if (!context) {
    throw new Error("useAppAuthState must be used inside AppStateProvider");
  }
  return context;
}

export function useAppAdminState(): AppAdminState {
  const context = useContext(AppAdminStateContext);
  if (!context) {
    throw new Error("useAppAdminState must be used inside AppStateProvider");
  }
  return context;
}

export function useAppContentState(): AppContentState {
  const context = useContext(AppContentStateContext);
  if (!context) {
    throw new Error("useAppContentState must be used inside AppStateProvider");
  }
  return context;
}

export function useAppSiteState(): AppSiteState {
  const context = useContext(AppSiteStateContext);
  if (!context) {
    throw new Error("useAppSiteState must be used inside AppStateProvider");
  }
  return context;
}
