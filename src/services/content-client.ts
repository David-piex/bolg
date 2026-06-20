import type { ContentDataset } from "@/data/repository";
import type { MembershipLevel } from "@/domain/membership";
import type { AlbumRecord, PhotoRecord, PostRecord, VideoCollectionRecord, VideoRecord } from "@/data/mock-data";
import {
  createAlbum,
  createPost,
  createVideo,
  deleteAlbum,
  deletePost,
  deleteVideo,
  listAlbums,
  listContent,
  listPosts,
  listVideos,
  type JavaAlbum,
  type JavaContentPage,
  type JavaContentVisibility,
  type JavaPost,
  type JavaVideo,
  updateAlbum,
  updatePost,
  updateVideo
} from "@/services/java-api-client";

type ErrorBody = {
  error?: string;
};

function errorMessageFromBody(body: unknown): string | undefined {
  if (body && typeof body === "object" && "error" in body) {
    const message = (body as ErrorBody).error;
    return typeof message === "string" ? message : undefined;
  }

  return undefined;
}

export type RemotePublishInput =
  | {
      body: string;
      coverImage?: string;
      kind: "post";
      mediaAssetId?: string;
      title: string;
      visibility: MembershipLevel;
    }
  | {
      description: string;
      imageUrl?: string;
      kind: "album";
      mediaAssetId?: string;
      photoTitle: string;
      title: string;
      visibility: MembershipLevel;
    }
  | {
      coverMediaId?: string;
      description: string;
      kind: "video";
      mediaAssetId?: string;
      playbackUrl?: string;
      thumbnailUrl?: string;
      title: string;
      videoTitle: string;
      visibility: MembershipLevel;
    };

export type RemoteUpdateInput =
  | {
      body: string;
      coverImage?: string;
      id: string;
      kind: "post";
      mediaAssetId?: string;
      title: string;
      visibility: MembershipLevel;
    }
  | {
      coverImage?: string;
      coverMediaId?: string;
      defaultVisibility: MembershipLevel;
      description: string;
      id: string;
      kind: "album";
      title: string;
    }
  | {
      coverImage?: string;
      coverMediaId?: string;
      defaultVisibility: MembershipLevel;
      description: string;
      id: string;
      kind: "video";
      title: string;
    };

export type RemoteDeleteInput = {
  id: string;
  kind: "post" | "album" | "video";
};

export type RemotePublishResult =
  | { post: PostRecord }
  | { album: AlbumRecord; photo: PhotoRecord }
  | { collection: VideoCollectionRecord; video: VideoRecord };

export type RemoteContentPage<T> = {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
};

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T | ErrorBody;

  if (!response.ok) {
    throw new Error(errorMessageFromBody(body) || fallback);
  }

  return body as T;
}

function toJavaVisibility(visibility: MembershipLevel): JavaContentVisibility {
  return visibility.toUpperCase() as JavaContentVisibility;
}

function fromJavaVisibility(visibility: JavaContentVisibility): MembershipLevel {
  return visibility.toLowerCase() as MembershipLevel;
}

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

function mediaViewUrl(mediaId: string | null | undefined): string {
  return mediaId ? `/api/media/${encodeURIComponent(mediaId)}/view` : "";
}

function mediaAccessUrl(mediaId: string | null | undefined): string {
  return mediaId ? `/api/media/${encodeURIComponent(mediaId)}/view` : "";
}

function postFromJava(post: JavaPost): PostRecord {
  const firstMediaId = post.mediaAssetIds?.[0];
  return {
    body: post.content,
    coverImage: mediaViewUrl(firstMediaId),
    excerpt: post.content.slice(0, 120),
    id: post.id,
    publishedAt: dateOnly(post.publishedAt),
    title: post.title,
    type: "post",
    visibility: fromJavaVisibility(post.visibility)
  };
}

function albumFromJava(album: JavaAlbum): AlbumRecord {
  return {
    coverImage: mediaViewUrl(album.coverMediaId),
    defaultVisibility: fromJavaVisibility(album.visibility),
    description: album.description,
    id: album.id,
    publishedAt: dateOnly(album.publishedAt),
    title: album.title
  };
}

function videoCollectionFromJava(video: JavaVideo): VideoCollectionRecord {
  return {
    coverImage: mediaViewUrl(video.coverMediaId),
    defaultVisibility: fromJavaVisibility(video.visibility),
    description: video.description,
    id: `collection-${video.id}`,
    publishedAt: dateOnly(video.publishedAt),
    title: video.title
  };
}

function videoFromJava(video: JavaVideo): VideoRecord {
  return {
    collectionId: `collection-${video.id}`,
    description: video.description,
    id: video.id,
    mediaAssetId: video.mediaAssetId,
    playbackUrl: mediaAccessUrl(video.mediaAssetId),
    processingState: "ready",
    sortOrder: 1,
    thumbnailUrl: mediaViewUrl(video.coverMediaId),
    title: video.title,
    visibilityOverride: null
  };
}

export async function fetchRemoteContentDataset(accessToken?: string): Promise<ContentDataset> {
  const feed = await listContent();
  return {
    albums: feed.albums.map(albumFromJava),
    photos: [],
    posts: feed.posts.map(postFromJava),
    videoCollections: feed.videos.map(videoCollectionFromJava),
    videos: feed.videos.map(videoFromJava)
  };
}

export async function fetchRemotePostsPage(input: { page?: number; size?: number } = {}): Promise<RemoteContentPage<PostRecord>> {
  return contentPageFromJava(await listPosts(input), postFromJava);
}

export async function fetchRemoteAlbumsPage(input: { page?: number; size?: number } = {}): Promise<RemoteContentPage<AlbumRecord>> {
  return contentPageFromJava(await listAlbums(input), albumFromJava);
}

export async function fetchRemoteVideosPage(
  input: { page?: number; size?: number } = {}
): Promise<RemoteContentPage<{ collection: VideoCollectionRecord; video: VideoRecord }>> {
  return contentPageFromJava(await listVideos(input), (video) => ({
    collection: videoCollectionFromJava(video),
    video: videoFromJava(video)
  }));
}

export async function publishRemoteContent(
  accessToken: string,
  input: RemotePublishInput
): Promise<RemotePublishResult> {
  if (input.kind === "post") {
    const post = await createPost({
      content: input.body,
      mediaAssetIds: input.mediaAssetId ? [input.mediaAssetId] : undefined,
      title: input.title,
      visibility: toJavaVisibility(input.visibility)
    });
    return { post: postFromJava(post) };
  }

  if (input.kind === "album") {
    const album = await createAlbum({
      coverMediaId: input.mediaAssetId,
      description: input.description,
      title: input.title,
      visibility: toJavaVisibility(input.visibility)
    });
    return {
      album: albumFromJava(album),
      photo: {
        albumId: album.id,
        id: `${album.id}-photo-placeholder`,
        imageUrl: mediaViewUrl(input.mediaAssetId) || input.imageUrl || "",
        sortOrder: 1,
        title: input.photoTitle,
        visibilityOverride: null
      }
    };
  }

  const video = await createVideo({
    coverMediaId: input.coverMediaId,
    description: input.description,
    mediaAssetId: input.mediaAssetId || input.playbackUrl || "",
    title: input.videoTitle || input.title,
    visibility: toJavaVisibility(input.visibility)
  });
  return {
    collection: videoCollectionFromJava(video),
    video: videoFromJava(video)
  };
}

export async function updateRemoteContent(accessToken: string, input: RemoteUpdateInput): Promise<void> {
  if (input.kind === "post") {
    await updatePost({
      content: input.body,
      id: input.id,
      mediaAssetIds: input.mediaAssetId ? [input.mediaAssetId] : undefined,
      title: input.title,
      visibility: toJavaVisibility(input.visibility)
    });
    return;
  }

  if (input.kind === "album") {
    await updateAlbum({
      coverMediaId: input.coverMediaId,
      description: input.description,
      id: input.id,
      title: input.title,
      visibility: toJavaVisibility(input.defaultVisibility)
    });
    return;
  }

  await updateVideo({
    coverMediaId: input.coverMediaId,
    description: input.description,
    id: javaVideoIdFromCollectionId(input.id),
    title: input.title,
    visibility: toJavaVisibility(input.defaultVisibility)
  });
}

export async function deleteRemoteContent(accessToken: string, input: RemoteDeleteInput): Promise<void> {
  if (input.kind === "post") {
    await deletePost(input.id);
    return;
  }

  if (input.kind === "album") {
    await deleteAlbum(input.id);
    return;
  }

  await deleteVideo(javaVideoIdFromCollectionId(input.id));
}

function javaVideoIdFromCollectionId(id: string): string {
  return id.startsWith("collection-") ? id.slice("collection-".length) : id;
}

function contentPageFromJava<TJava, TItem>(
  page: JavaContentPage<TJava>,
  mapItem: (item: TJava) => TItem
): RemoteContentPage<TItem> {
  return {
    items: page.items.map(mapItem),
    page: page.page,
    size: page.size,
    total: page.total,
    totalPages: page.totalPages
  };
}
