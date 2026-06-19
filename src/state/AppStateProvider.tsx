"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { fetchRemoteContentDataset, publishRemoteContent } from "@/services/content-client";
import { consumeInviteCode, type InviteCode } from "@/domain/invites";
import type { MembershipLevel, Viewer } from "@/domain/membership";
import {
  loginWithPasswordClient,
  registerWithInviteClient,
  type ClientLoginSession
} from "@/services/auth-client";
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
  | { ok: true }
  | { ok: false; message: string };

type AuthSession = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
};

type AppStateValue = {
  users: UserProfile[];
  invites: InviteCode[];
  posts: PostRecord[];
  albums: AlbumRecord[];
  photos: PhotoRecord[];
  videoCollections: VideoCollectionRecord[];
  videos: VideoRecord[];
  currentUserId: string | null;
  currentUser: UserProfile | null;
  authSession: AuthSession | null;
  viewer: Viewer;
  registerWithInvite: (input: { name: string; email: string; inviteCode: string }) => RegisterResult;
  registerWithPassword: (input: { name: string; email: string; inviteCode: string; password: string }) => Promise<RemoteAuthResult>;
  loginWithPassword: (input: { email: string; password: string }) => Promise<RemoteAuthResult>;
  loginAs: (userId: string | null) => void;
  updateUserLevel: (userId: string, level: Exclude<MembershipLevel, "public">) => void;
  toggleUserDisabled: (userId: string) => void;
  generateInvite: (level: Exclude<MembershipLevel, "public">) => string;
  publishPost: (input: {
    title: string;
    body: string;
    visibility: MembershipLevel;
    coverImage?: string;
  }) => void;
  createAlbumWithPhoto: (input: {
    title: string;
    description: string;
    visibility: MembershipLevel;
    photoTitle: string;
    imageUrl?: string;
  }) => void;
  createVideoCollectionWithVideo: (input: {
    title: string;
    description: string;
    visibility: MembershipLevel;
    videoTitle: string;
    playbackUrl?: string;
    cloudinaryPublicId?: string;
    thumbnailUrl?: string;
  }) => void;
};

const storageKey = "media-gate-state-v1";

const AppStateContext = createContext<AppStateValue | null>(null);

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

function hydrateState(saved: Partial<PersistedState>): PersistedState {
  const initial = createInitialState();
  return {
    users: saved.users ?? initial.users,
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

function userFromSession(session: ClientLoginSession): UserProfile {
  return {
    disabled: session.profile.disabled,
    email: session.profile.email,
    id: session.profile.userId,
    isAdmin: session.profile.isAdmin,
    level: session.profile.level,
    name: session.profile.displayName
  };
}

function upsertUser(users: UserProfile[], user: UserProfile): UserProfile[] {
  const exists = users.some((current) => current.id === user.id);

  if (!exists) {
    return [...users, user];
  }

  return users.map((current) => (current.id === user.id ? user : current));
}

function sessionFromLogin(session: ClientLoginSession): AuthSession {
  return {
    accessToken: session.accessToken,
    expiresIn: session.expiresIn,
    refreshToken: session.refreshToken
  };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(createInitialState);
  const [hydrated, setHydrated] = useState(false);

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

        setState((current) => ({
          ...current,
          albums: dataset.albums ?? current.albums,
          photos: dataset.photos ?? current.photos,
          posts: dataset.posts ?? current.posts,
          videoCollections: dataset.videoCollections ?? current.videoCollections,
          videos: dataset.videos ?? current.videos
        }));
      })
      .catch(() => {
        // Keep local demo content when Supabase content is not configured.
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, state.authSession?.accessToken]);

  const value = useMemo<AppStateValue>(() => {
    const currentUser = state.users.find((user) => user.id === state.currentUserId) ?? null;

    return {
      users: state.users,
      invites: state.invites,
      posts: state.posts,
      albums: state.albums,
      photos: state.photos,
      videoCollections: state.videoCollections,
      videos: state.videos,
      currentUserId: state.currentUserId,
      currentUser,
      authSession: state.authSession,
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

          return { ok: true };
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

          return { ok: true };
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
      updateUserLevel(userId, level) {
        setState((current) => ({
          ...current,
          users: current.users.map((user) => (user.id === userId ? { ...user, level } : user))
        }));
      },
      toggleUserDisabled(userId) {
        setState((current) => ({
          ...current,
          users: current.users.map((user) =>
            user.id === userId ? { ...user, disabled: !user.disabled } : user
          )
        }));
      },
      generateInvite(level) {
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
      publishPost(input) {
        const id = `post-${Date.now()}`;
        const post: PostRecord = {
          id,
          type: "post",
          title: input.title.trim() || "Untitled post",
          excerpt: input.body.trim().slice(0, 120) || input.title.trim() || "New post",
          body: input.body,
          coverImage:
            input.coverImage ||
            "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80",
          visibility: input.visibility,
          publishedAt: new Date().toISOString().slice(0, 10)
        };
        setState((current) => ({ ...current, posts: [post, ...current.posts] }));

        if (state.authSession?.accessToken) {
          void publishRemoteContent(state.authSession.accessToken, {
            body: post.body,
            coverImage: post.coverImage,
            kind: "post",
            title: post.title,
            visibility: post.visibility
          })
            .then((result) => {
              if ("post" in result) {
                setState((current) => ({
                  ...current,
                  posts: [result.post, ...current.posts.filter((currentPost) => currentPost.id !== id)]
                }));
              }
            })
            .catch(() => {
              // Keep the optimistic local demo record if production publishing is unavailable.
            });
        }
      },
      createAlbumWithPhoto(input) {
        const timestamp = Date.now();
        const albumId = `album-${timestamp}`;
        const album: AlbumRecord = {
          id: albumId,
          title: input.title.trim() || "Untitled album",
          description: input.description.trim() || "New album",
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
        setState((current) => ({
          ...current,
          albums: [album, ...current.albums],
          photos: [photo, ...current.photos]
        }));

        if (state.authSession?.accessToken) {
          void publishRemoteContent(state.authSession.accessToken, {
            description: album.description,
            imageUrl: photo.imageUrl,
            kind: "album",
            photoTitle: photo.title,
            title: album.title,
            visibility: album.defaultVisibility
          })
            .then((result) => {
              if ("album" in result) {
                setState((current) => ({
                  ...current,
                  albums: [result.album, ...current.albums.filter((currentAlbum) => currentAlbum.id !== albumId)],
                  photos: [
                    result.photo,
                    ...current.photos.filter((currentPhoto) => currentPhoto.albumId !== albumId)
                  ]
                }));
              }
            })
            .catch(() => {
              // Keep the optimistic local demo record if production publishing is unavailable.
            });
        }
      },
      createVideoCollectionWithVideo(input) {
        const timestamp = Date.now();
        const collectionId = `video-collection-${timestamp}`;
        const playbackUrl =
          input.playbackUrl || "https://res.cloudinary.com/demo/video/upload/sample.mp4";
        const thumbnailUrl =
          input.thumbnailUrl || "https://res.cloudinary.com/demo/video/upload/so_0/sample.jpg";
        const collection: VideoCollectionRecord = {
          id: collectionId,
          title: input.title.trim() || "Untitled videos",
          description: input.description.trim() || "New video collection",
          coverImage: thumbnailUrl,
          defaultVisibility: input.visibility,
          publishedAt: new Date().toISOString().slice(0, 10)
        };
        const video: VideoRecord = {
          id: `video-${timestamp}`,
          collectionId,
          title: input.videoTitle.trim() || collection.title,
          description: collection.description,
          cloudinaryPublicId: input.cloudinaryPublicId || `local/${timestamp}`,
          playbackUrl,
          thumbnailUrl,
          visibilityOverride: null,
          processingState: "ready",
          sortOrder: 1
        };
        setState((current) => ({
          ...current,
          videoCollections: [collection, ...current.videoCollections],
          videos: [video, ...current.videos]
        }));

        if (state.authSession?.accessToken) {
          void publishRemoteContent(state.authSession.accessToken, {
            cloudinaryPublicId: video.cloudinaryPublicId,
            description: collection.description,
            kind: "video",
            playbackUrl: video.playbackUrl,
            thumbnailUrl: video.thumbnailUrl,
            title: collection.title,
            videoTitle: video.title,
            visibility: collection.defaultVisibility
          })
            .then((result) => {
              if ("collection" in result) {
                setState((current) => ({
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
            })
            .catch(() => {
              // Keep the optimistic local demo record if production publishing is unavailable.
            });
        }
      }
    };
  }, [state]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used inside AppStateProvider");
  }
  return context;
}
