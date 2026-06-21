import { filterVisibleItems, resolveRequiredLevel, type VisibilityCollection } from "@/domain/content";
import { canViewContent, type MembershipLevel, type Viewer } from "@/domain/membership";
import {
  albums,
  invites,
  photos,
  posts,
  scenarioViewers,
  users,
  videoCollections,
  videos,
  type AlbumRecord,
  type PhotoRecord,
  type PostRecord,
  type VideoCollectionRecord,
  type VideoRecord
} from "@/data/mock-data";

export type ContentDataset = {
  posts?: PostRecord[];
  albums?: AlbumRecord[];
  photos?: PhotoRecord[];
  videoCollections?: VideoCollectionRecord[];
  videos?: VideoRecord[];
};

export type FeedItem = {
  id: string;
  kind: "post" | "album" | "videoCollection";
  title: string;
  excerpt: string;
  coverImage: string;
  pinned?: boolean;
  requiredLevel: MembershipLevel;
  publishedAt: string;
};

export type VisiblePhoto = PhotoRecord & {
  requiredLevel: MembershipLevel;
};

export type VisibleAlbum = AlbumRecord & {
  photos: VisiblePhoto[];
};

export type VisibleVideo = VideoRecord & {
  requiredLevel: MembershipLevel;
};

export type VisibleVideoCollection = VideoCollectionRecord & {
  videos: VisibleVideo[];
};

export function getViewerByScenario(scenario: string): Viewer {
  return scenarioViewers[scenario] ?? null;
}

function resolveDataset(dataset: ContentDataset = {}) {
  return {
    posts: dataset.posts ?? posts,
    albums: dataset.albums ?? albums,
    photos: dataset.photos ?? photos,
    videoCollections: dataset.videoCollections ?? videoCollections,
    videos: dataset.videos ?? videos
  };
}

function isPublished(record: { status?: "published" | "draft" }): boolean {
  return (record.status ?? "published") === "published";
}

export function getPosts(viewer: Viewer, dataset: ContentDataset = {}): PostRecord[] {
  return resolveDataset(dataset).posts.filter((post) => isPublished(post) && canViewContent(viewer, post.visibility));
}

export function getHomeFeed(viewer: Viewer, dataset: ContentDataset = {}): FeedItem[] {
  const data = resolveDataset(dataset);
  const postItems: FeedItem[] = data.posts.filter(isPublished).map((post) => ({
    id: post.id,
    kind: "post" as const,
    title: post.title,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    requiredLevel: post.visibility,
    pinned: post.pinned,
    publishedAt: post.publishedAt
  }));

  const albumItems: FeedItem[] = data.albums.filter(isPublished).map((album) => ({
    id: album.id,
    kind: "album" as const,
    title: album.title,
    excerpt: album.description,
    coverImage: album.coverImage,
    requiredLevel: album.defaultVisibility,
    publishedAt: album.publishedAt
  }));

  const videoItems: FeedItem[] = data.videoCollections.filter(isPublished).map((collection) => ({
    id: collection.id,
    kind: "videoCollection" as const,
    title: collection.title,
    excerpt: collection.description,
    coverImage: collection.coverImage,
    requiredLevel: collection.defaultVisibility,
    publishedAt: collection.publishedAt
  }));

  return [...postItems, ...albumItems, ...videoItems]
    .filter((item) => canViewContent(viewer, item.requiredLevel))
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))
      || b.publishedAt.localeCompare(a.publishedAt));
}

export function getAlbums(viewer: Viewer, dataset: ContentDataset = {}): VisibleAlbum[] {
  const data = resolveDataset(dataset);
  return data.albums
    .filter((album) => isPublished(album) && canViewContent(viewer, album.defaultVisibility))
    .map((album) => {
      const collection: VisibilityCollection = {
        id: album.id,
        defaultVisibility: album.defaultVisibility
      };
      const albumPhotos = data.photos.filter((photo) => photo.albumId === album.id);
      const visiblePhotos = filterVisibleItems(
        viewer,
        albumPhotos.map((photo) => ({
          ...photo,
          collectionId: photo.albumId
        })),
        collection
      )
        .map((photo) => ({
          ...photo,
          requiredLevel: resolveRequiredLevel(photo, collection)
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder);

      return {
        ...album,
        photos: visiblePhotos
      };
    });
}

export function getVideoCollections(viewer: Viewer, dataset: ContentDataset = {}): VisibleVideoCollection[] {
  const data = resolveDataset(dataset);
  return data.videoCollections
    .filter((collection) => isPublished(collection) && canViewContent(viewer, collection.defaultVisibility))
    .map((collection) => {
      const visibilityCollection: VisibilityCollection = {
        id: collection.id,
        defaultVisibility: collection.defaultVisibility
      };
      const collectionVideos = data.videos.filter((video) => video.collectionId === collection.id);
      const visibleVideos = filterVisibleItems(
        viewer,
        collectionVideos.map((video) => ({
          ...video,
          collectionId: video.collectionId
        })),
        visibilityCollection
      )
        .map((video) => ({
          ...video,
          requiredLevel: resolveRequiredLevel(video, visibilityCollection)
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder);

      return {
        ...collection,
        videos: visibleVideos
      };
    });
}

export function getAdminSummary() {
  return {
    users: users.length,
    unusedInvites: invites.filter((invite) => !invite.usedByUserId).length,
    posts: posts.length,
    albums: albums.length,
    videoCollections: videoCollections.length
  };
}
