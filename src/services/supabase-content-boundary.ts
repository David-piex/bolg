import type { ContentDataset } from "@/data/repository";
import type {
  AlbumRecord,
  PhotoRecord,
  PostRecord,
  VideoCollectionRecord,
  VideoRecord
} from "@/data/mock-data";

type SupabaseContentConfig = {
  anonKey: string;
  url: string;
};

type PostRow = {
  body: string;
  cover_image: string;
  excerpt: string;
  id: string;
  published_at: string;
  title: string;
  visibility: PostRecord["visibility"];
};

type AlbumRow = {
  cover_image: string;
  default_visibility: AlbumRecord["defaultVisibility"];
  description: string;
  id: string;
  published_at: string;
  title: string;
};

type PhotoRow = {
  album_id: string;
  id: string;
  image_url: string;
  sort_order: number;
  title: string;
  visibility_override: PhotoRecord["visibilityOverride"];
};

type VideoCollectionRow = {
  cover_image: string;
  default_visibility: VideoCollectionRecord["defaultVisibility"];
  description: string;
  id: string;
  published_at: string;
  title: string;
};

type VideoRow = {
  cloudinary_public_id: string;
  collection_id: string;
  description: string;
  id: string;
  playback_url: string;
  processing_state: VideoRecord["processingState"];
  sort_order: number;
  thumbnail_url: string;
  title: string;
  visibility_override: VideoRecord["visibilityOverride"];
};

const contentQueries = {
  albums:
    "/rest/v1/albums?select=id,title,description,cover_image,default_visibility,published_at&order=published_at.desc",
  photos: "/rest/v1/photos?select=id,album_id,title,image_url,visibility_override,sort_order&order=sort_order.asc",
  posts: "/rest/v1/posts?select=id,title,excerpt,body,cover_image,visibility,published_at&order=published_at.desc",
  videoCollections:
    "/rest/v1/video_collections?select=id,title,description,cover_image,default_visibility,published_at&order=published_at.desc",
  videos:
    "/rest/v1/videos?select=id,collection_id,title,description,cloudinary_public_id,playback_url,thumbnail_url,visibility_override,processing_state,sort_order&order=sort_order.asc"
};

function requireSupabaseContentConfig(): SupabaseContentConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase content environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return {
    anonKey,
    url: url.replace(/\/+$/, "")
  };
}

function contentHeaders(config: SupabaseContentConfig, accessToken?: string) {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${accessToken || config.anonKey}`
  };
}

async function assertOk(response: Response, operation: string) {
  if (response.ok) {
    return;
  }

  const details = await response.text().catch(() => "");
  throw new Error(`${operation} failed with ${response.status}${details ? `: ${details}` : ""}`);
}

async function fetchRows<TRow>(config: SupabaseContentConfig, path: string, accessToken?: string): Promise<TRow[]> {
  const response = await fetch(`${config.url}${path}`, {
    headers: contentHeaders(config, accessToken)
  });

  await assertOk(response, "fetchContentDataset");
  return (await response.json()) as TRow[];
}

function mapPost(row: PostRow): PostRecord {
  return {
    body: row.body,
    coverImage: row.cover_image,
    excerpt: row.excerpt,
    id: row.id,
    publishedAt: row.published_at,
    title: row.title,
    type: "post",
    visibility: row.visibility
  };
}

function mapAlbum(row: AlbumRow): AlbumRecord {
  return {
    coverImage: row.cover_image,
    defaultVisibility: row.default_visibility,
    description: row.description,
    id: row.id,
    publishedAt: row.published_at,
    title: row.title
  };
}

function mapPhoto(row: PhotoRow): PhotoRecord {
  return {
    albumId: row.album_id,
    id: row.id,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
    title: row.title,
    visibilityOverride: row.visibility_override
  };
}

function mapVideoCollection(row: VideoCollectionRow): VideoCollectionRecord {
  return {
    coverImage: row.cover_image,
    defaultVisibility: row.default_visibility,
    description: row.description,
    id: row.id,
    publishedAt: row.published_at,
    title: row.title
  };
}

function mapVideo(row: VideoRow): VideoRecord {
  return {
    cloudinaryPublicId: row.cloudinary_public_id,
    collectionId: row.collection_id,
    description: row.description,
    id: row.id,
    playbackUrl: row.playback_url,
    processingState: row.processing_state,
    sortOrder: row.sort_order,
    thumbnailUrl: row.thumbnail_url,
    title: row.title,
    visibilityOverride: row.visibility_override
  };
}

export async function fetchContentDataset(accessToken?: string): Promise<ContentDataset> {
  const config = requireSupabaseContentConfig();
  const [postRows, albumRows, photoRows, videoCollectionRows, videoRows] = await Promise.all([
    fetchRows<PostRow>(config, contentQueries.posts, accessToken),
    fetchRows<AlbumRow>(config, contentQueries.albums, accessToken),
    fetchRows<PhotoRow>(config, contentQueries.photos, accessToken),
    fetchRows<VideoCollectionRow>(config, contentQueries.videoCollections, accessToken),
    fetchRows<VideoRow>(config, contentQueries.videos, accessToken)
  ]);

  return {
    albums: albumRows.map(mapAlbum),
    photos: photoRows.map(mapPhoto),
    posts: postRows.map(mapPost),
    videoCollections: videoCollectionRows.map(mapVideoCollection),
    videos: videoRows.map(mapVideo)
  };
}
