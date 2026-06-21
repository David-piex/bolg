import type { ContentDataset } from "@/data/repository";
import type { MembershipLevel } from "@/domain/membership";
import type {
  AlbumRecord,
  ContentRecordStatus,
  PhotoRecord,
  PostRecord,
  VideoCollectionRecord,
  VideoRecord
} from "@/data/mock-data";
import {
  createAlbum,
  createPost,
  createVideo,
  deleteAlbum,
  deletePost,
  deleteVideo,
  getAlbum,
  getPost,
  getVideo,
  listAlbums,
  listContent,
  listPosts,
  listVideos,
  type JavaAlbum,
  type JavaContentPage,
  type JavaContentStatus,
  type JavaContentVisibility,
  type ListContentPageInput,
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
      category?: string;
      coverImage?: string;
      kind: "post";
      mediaAssetId?: string;
      pinned?: boolean;
      status?: ContentRecordStatus;
      scheduledAt?: string;
      tags?: string[];
      title: string;
      visibility: MembershipLevel;
    }
  | {
      category?: string;
      description: string;
      imageUrl?: string;
      kind: "album";
      mediaAssetId?: string;
      photoTitle: string;
      status?: ContentRecordStatus;
      scheduledAt?: string;
      tags?: string[];
      title: string;
      visibility: MembershipLevel;
    }
  | {
      category?: string;
      coverMediaId?: string;
      description: string;
      kind: "video";
      mediaAssetId?: string;
      playbackUrl?: string;
      thumbnailUrl?: string;
      title: string;
      status?: ContentRecordStatus;
      scheduledAt?: string;
      tags?: string[];
      videoTitle: string;
      visibility: MembershipLevel;
    };

export type RemoteUpdateInput =
  | {
      body: string;
      category?: string;
      coverImage?: string;
      id: string;
      kind: "post";
      mediaAssetId?: string;
      pinned?: boolean;
      status?: ContentRecordStatus;
      scheduledAt?: string;
      tags?: string[];
      title: string;
      visibility: MembershipLevel;
    }
  | {
      category?: string;
      coverImage?: string;
      coverMediaId?: string;
      defaultVisibility: MembershipLevel;
      description: string;
      id: string;
      kind: "album";
      status?: ContentRecordStatus;
      scheduledAt?: string;
      tags?: string[];
      title: string;
    }
  | {
      category?: string;
      coverImage?: string;
      coverMediaId?: string;
      defaultVisibility: MembershipLevel;
      description: string;
      id: string;
      kind: "video";
      status?: ContentRecordStatus;
      scheduledAt?: string;
      tags?: string[];
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

export type RemoteContentPageInput = ListContentPageInput;

export type RemoteDetail =
  | { kind: "post"; post: PostRecord }
  | { album: AlbumRecord; kind: "album"; photos: PhotoRecord[] }
  | { collection: VideoCollectionRecord; kind: "video"; videos: VideoRecord[] };

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

function toJavaStatus(status: ContentRecordStatus | undefined): JavaContentStatus {
  return (status ?? "published").toUpperCase() as JavaContentStatus;
}

function fromJavaStatus(status: JavaContentStatus | undefined): ContentRecordStatus {
  if (status === "DRAFT") return "draft";
  if (status === "SCHEDULED") return "scheduled";
  return "published";
}

function dateOnly(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function taxonomyTags(tags: string[] | null | undefined): string[] {
  return Array.isArray(tags) ? tags.filter((tag) => tag.trim()).map((tag) => tag.trim()) : [];
}

function mediaViewUrl(mediaId: string | null | undefined): string {
  return mediaId ? `/api/media/${encodeURIComponent(mediaId)}/view` : "";
}

function mediaAccessUrl(mediaId: string | null | undefined): string {
  return mediaId ? `/api/media/${encodeURIComponent(mediaId)}/view` : "";
}

export function postFromJava(post: JavaPost): PostRecord {
  const firstMediaId = post.mediaAssetIds?.[0];
  return {
    body: post.content,
    category: post.category ?? "",
    coverImage: mediaViewUrl(firstMediaId),
    excerpt: post.content.slice(0, 120),
    id: post.id,
    pinned: Boolean(post.pinned),
    publishedAt: dateOnly(post.publishedAt),
    scheduledAt: dateOnly(post.scheduledAt),
    status: fromJavaStatus(post.status),
    tags: taxonomyTags(post.tags),
    title: post.title,
    type: "post",
    visibility: fromJavaVisibility(post.visibility)
  };
}

export function albumFromJava(album: JavaAlbum): AlbumRecord {
  return {
    category: album.category ?? "",
    coverImage: mediaViewUrl(album.coverMediaId),
    defaultVisibility: fromJavaVisibility(album.visibility),
    description: album.description,
    id: album.id,
    publishedAt: dateOnly(album.publishedAt),
    scheduledAt: dateOnly(album.scheduledAt),
    status: fromJavaStatus(album.status),
    tags: taxonomyTags(album.tags),
    title: album.title
  };
}

export function videoCollectionFromJava(video: JavaVideo): VideoCollectionRecord {
  return {
    category: video.category ?? "",
    coverImage: mediaViewUrl(video.coverMediaId),
    defaultVisibility: fromJavaVisibility(video.visibility),
    description: video.description,
    id: `collection-${video.id}`,
    publishedAt: dateOnly(video.publishedAt),
    scheduledAt: dateOnly(video.scheduledAt),
    status: fromJavaStatus(video.status),
    tags: taxonomyTags(video.tags),
    title: video.title
  };
}

export function videoFromJava(video: JavaVideo): VideoRecord {
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

export function detailFromJavaPost(post: JavaPost): RemoteDetail {
  return {
    kind: "post",
    post: postFromJava(post)
  };
}

export function detailFromJavaAlbum(album: JavaAlbum): RemoteDetail {
  return {
    album: albumFromJava(album),
    kind: "album",
    photos: album.coverMediaId
      ? [
          {
            albumId: album.id,
            id: `${album.id}-cover`,
            imageUrl: mediaViewUrl(album.coverMediaId),
            sortOrder: 1,
            title: album.title,
            visibilityOverride: null
          }
        ]
      : []
  };
}

export function detailFromJavaVideo(video: JavaVideo): RemoteDetail {
  return {
    collection: videoCollectionFromJava(video),
    kind: "video",
    videos: [videoFromJava(video)]
  };
}

export async function fetchRemotePostsPage(input: RemoteContentPageInput = {}): Promise<RemoteContentPage<PostRecord>> {
  return contentPageFromJava(await listPosts(input), postFromJava);
}

export async function fetchRemoteAlbumsPage(input: RemoteContentPageInput = {}): Promise<RemoteContentPage<AlbumRecord>> {
  return contentPageFromJava(await listAlbums(input), albumFromJava);
}

export async function fetchRemoteVideosPage(
  input: RemoteContentPageInput = {}
): Promise<RemoteContentPage<{ collection: VideoCollectionRecord; video: VideoRecord }>> {
  return contentPageFromJava(await listVideos(input), (video) => ({
    collection: videoCollectionFromJava(video),
    video: videoFromJava(video)
  }));
}

export async function fetchRemotePostDetail(id: string): Promise<RemoteDetail> {
  return detailFromJavaPost(await getPost(id));
}

export async function fetchRemoteAlbumDetail(id: string): Promise<RemoteDetail> {
  return detailFromJavaAlbum(await getAlbum(id));
}

export async function fetchRemoteVideoDetail(id: string): Promise<RemoteDetail> {
  return detailFromJavaVideo(await getVideo(javaVideoIdFromCollectionId(id)));
}

export async function publishRemoteContent(
  accessToken: string,
  input: RemotePublishInput
): Promise<RemotePublishResult> {
  if (input.kind === "post") {
    const post = await createPost({
      category: input.category,
      content: input.body,
      mediaAssetIds: input.mediaAssetId ? [input.mediaAssetId] : undefined,
      pinned: Boolean(input.pinned),
      status: toJavaStatus(input.status),
      scheduledAt: input.scheduledAt,
      tags: input.tags,
      title: input.title,
      visibility: toJavaVisibility(input.visibility)
    });
    return { post: postFromJava(post) };
  }

  if (input.kind === "album") {
    const album = await createAlbum({
      category: input.category,
      coverMediaId: input.mediaAssetId,
      description: input.description,
      status: toJavaStatus(input.status),
      scheduledAt: input.scheduledAt,
      tags: input.tags,
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
    category: input.category,
    coverMediaId: input.coverMediaId,
    description: input.description,
    mediaAssetId: input.mediaAssetId || input.playbackUrl || "",
    status: toJavaStatus(input.status),
    scheduledAt: input.scheduledAt,
    tags: input.tags,
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
      category: input.category,
      content: input.body,
      id: input.id,
      mediaAssetIds: input.mediaAssetId ? [input.mediaAssetId] : undefined,
      pinned: input.pinned,
      status: toJavaStatus(input.status),
      scheduledAt: input.scheduledAt,
      tags: input.tags,
      title: input.title,
      visibility: toJavaVisibility(input.visibility)
    });
    return;
  }

  if (input.kind === "album") {
    await updateAlbum({
      category: input.category,
      coverMediaId: input.coverMediaId,
      description: input.description,
      id: input.id,
      status: toJavaStatus(input.status),
      scheduledAt: input.scheduledAt,
      tags: input.tags,
      title: input.title,
      visibility: toJavaVisibility(input.defaultVisibility)
    });
    return;
  }

  await updateVideo({
    category: input.category,
    coverMediaId: input.coverMediaId,
    description: input.description,
    id: javaVideoIdFromCollectionId(input.id),
    status: toJavaStatus(input.status),
    scheduledAt: input.scheduledAt,
    tags: input.tags,
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

export function javaVideoIdFromCollectionId(id: string): string {
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
