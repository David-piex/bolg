import type { InviteCode } from "@/domain/invites";
import type { MembershipLevel } from "@/domain/membership";
import type { AlbumRecord, PhotoRecord, PostRecord, VideoCollectionRecord, VideoRecord } from "@/data/mock-data";

export type SupabaseProfileUpdate = {
  userId: string;
  level?: Exclude<MembershipLevel, "public">;
  disabled?: boolean;
};

export type ImageUploadRequest = {
  fileName: string;
  contentType: string;
  visibility: MembershipLevel;
};

export type PersistPostInput = {
  body: string;
  coverImage?: string;
  title: string;
  userId: string;
  visibility: MembershipLevel;
};

export type PersistAlbumWithPhotoInput = {
  description: string;
  imageUrl?: string;
  photoTitle: string;
  title: string;
  userId: string;
  visibility: MembershipLevel;
};

export type PersistVideoCollectionWithVideoInput = {
  cloudinaryPublicId?: string;
  description: string;
  playbackUrl?: string;
  thumbnailUrl?: string;
  title: string;
  userId: string;
  videoTitle: string;
  visibility: MembershipLevel;
};

type SupabaseConfig = {
  serviceRoleKey: string;
  url: string;
};

type SupabaseUserResponse = {
  user?: {
    id?: string;
  } | null;
};

type SupabaseProfileResponse = Array<{
  disabled: boolean;
  is_admin: boolean;
}>;

type PostRow = {
  body: string;
  cover_image: string | null;
  excerpt: string;
  id: string;
  published_at: string;
  title: string;
  visibility: PostRecord["visibility"];
};

type AlbumRow = {
  cover_image: string | null;
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
  cover_image: string | null;
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
  thumbnail_url: string | null;
  title: string;
  visibility_override: VideoRecord["visibilityOverride"];
};

const writableContentTables = new Set(["posts", "albums", "photos", "video_collections", "videos"]);

function requireSupabaseConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  }

  return {
    serviceRoleKey,
    url: url.replace(/\/+$/, "")
  };
}

function serviceHeaders(config: SupabaseConfig, extraHeaders: Record<string, string> = {}) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    "Content-Type": "application/json",
    ...extraHeaders
  };
}

async function assertOk(response: Response, operation: string) {
  if (response.ok) {
    return;
  }

  const details = await response.text().catch(() => "");
  throw new Error(`${operation} failed with ${response.status}${details ? `: ${details}` : ""}`);
}

async function postReturningRow<TRow>(
  table: string,
  select: string,
  record: Record<string, unknown>
): Promise<TRow> {
  const config = requireSupabaseConfig();
  const response = await fetch(`${config.url}/rest/v1/${table}?select=${select}`, {
    body: JSON.stringify(record),
    headers: serviceHeaders(config, { Prefer: "return=representation" }),
    method: "POST"
  });

  await assertOk(response, `persist ${table}`);
  const rows = (await response.json()) as TRow[];
  const created = rows[0];

  if (!created) {
    throw new Error(`persist ${table} did not return a created row`);
  }

  return created;
}

function shortExcerpt(value: string, fallback: string): string {
  return (value.trim() || fallback.trim() || "New content").slice(0, 120);
}

function mapPost(row: PostRow): PostRecord {
  return {
    body: row.body,
    coverImage: row.cover_image || "",
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
    coverImage: row.cover_image || "",
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
    coverImage: row.cover_image || "",
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
    thumbnailUrl: row.thumbnail_url || "",
    title: row.title,
    visibilityOverride: row.visibility_override
  };
}

function bearerTokenFromRequest(request: Request): string | null {
  const header = request.headers.get("authorization");
  const prefix = "Bearer ";

  if (!header?.startsWith(prefix)) {
    return null;
  }

  const token = header.slice(prefix.length).trim();
  return token || null;
}

export async function requireAdminRequest(request: Request): Promise<{ userId: string }> {
  const token = bearerTokenFromRequest(request);

  if (!token) {
    throw new Error("Admin authorization is required");
  }

  const config = requireSupabaseConfig();
  const userResponse = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${token}`
    }
  });

  await assertOk(userResponse, "requireAdminRequest user lookup");

  const userBody = (await userResponse.json()) as SupabaseUserResponse;
  const userId = userBody.user?.id;

  if (!userId) {
    throw new Error("Admin authorization is invalid");
  }

  const profileResponse = await fetch(
    `${config.url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=is_admin,disabled`,
    {
      headers: serviceHeaders(config)
    }
  );

  await assertOk(profileResponse, "requireAdminRequest profile lookup");

  const profiles = (await profileResponse.json()) as SupabaseProfileResponse;
  const profile = profiles[0];

  if (!profile?.is_admin || profile.disabled) {
    throw new Error("Admin authorization is required");
  }

  return { userId };
}

function mapInvite(row: {
  code: string;
  id: string;
  note?: string | null;
  target_level: Exclude<MembershipLevel, "public">;
  used_by_user_id: string | null;
}): InviteCode {
  return {
    code: row.code,
    id: row.id,
    note: row.note ?? undefined,
    targetLevel: row.target_level,
    usedByUserId: row.used_by_user_id
  };
}

function slugifyFileName(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  const extension = lastDot >= 0 ? fileName.slice(lastDot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "bin";
  const base = lastDot >= 0 ? fileName.slice(0, lastDot) : fileName;
  const slug = base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "image"}.${extension || "bin"}`;
}

export async function createInviteCode(invite: Omit<InviteCode, "id" | "usedByUserId">): Promise<InviteCode> {
  const config = requireSupabaseConfig();
  const response = await fetch(`${config.url}/rest/v1/invite_codes?select=*`, {
    body: JSON.stringify({
      code: invite.code,
      note: invite.note,
      target_level: invite.targetLevel
    }),
    headers: serviceHeaders(config, { Prefer: "return=representation" }),
    method: "POST"
  });

  await assertOk(response, "createInviteCode");
  const rows = (await response.json()) as Array<Parameters<typeof mapInvite>[0]>;
  const created = rows[0];

  if (!created) {
    throw new Error("createInviteCode did not return a created row");
  }

  return mapInvite(created);
}

export async function updateProfileLevel(update: SupabaseProfileUpdate): Promise<void> {
  const config = requireSupabaseConfig();
  const payload: Record<string, boolean | string> = {};

  if (update.level) {
    payload.level = update.level;
  }

  if (typeof update.disabled === "boolean") {
    payload.disabled = update.disabled;
  }

  const response = await fetch(`${config.url}/rest/v1/profiles?id=eq.${encodeURIComponent(update.userId)}`, {
    body: JSON.stringify(payload),
    headers: serviceHeaders(config),
    method: "PATCH"
  });

  await assertOk(response, "updateProfileLevel");
}

export async function createSignedImageUpload(request: ImageUploadRequest): Promise<{ uploadUrl: string; path: string; token: string }> {
  const config = requireSupabaseConfig();
  const path = `${request.visibility}/${slugifyFileName(request.fileName)}`;
  const response = await fetch(`${config.url}/storage/v1/object/upload/sign/images/${path}`, {
    body: JSON.stringify({ contentType: request.contentType }),
    headers: serviceHeaders(config),
    method: "POST"
  });

  await assertOk(response, "createSignedImageUpload");
  const body = (await response.json()) as { signedURL?: string; token?: string };
  const signedPath = body.signedURL || "";
  const token = body.token || new URL(signedPath, config.url).searchParams.get("token") || "";

  if (!signedPath || !token) {
    throw new Error("createSignedImageUpload did not return a signed upload URL");
  }

  return {
    path,
    token,
    uploadUrl: new URL(signedPath, config.url).toString()
  };
}

export async function persistContentRecord(table: string, record: Record<string, unknown>): Promise<void> {
  if (!writableContentTables.has(table)) {
    throw new Error(`Unsupported Supabase table: ${table}`);
  }

  const config = requireSupabaseConfig();
  const response = await fetch(`${config.url}/rest/v1/${table}`, {
    body: JSON.stringify(record),
    headers: serviceHeaders(config),
    method: "POST"
  });

  await assertOk(response, "persistContentRecord");
}

export async function persistPost(input: PersistPostInput): Promise<PostRecord> {
  const row = await postReturningRow<PostRow>(
    "posts",
    "id,title,excerpt,body,cover_image,visibility,published_at",
    {
      body: input.body,
      cover_image: input.coverImage || "",
      created_by_user_id: input.userId,
      excerpt: shortExcerpt(input.body, input.title),
      title: input.title,
      visibility: input.visibility
    }
  );

  return mapPost(row);
}

export async function persistAlbumWithPhoto(
  input: PersistAlbumWithPhotoInput
): Promise<{ album: AlbumRecord; photo: PhotoRecord }> {
  const albumRow = await postReturningRow<AlbumRow>(
    "albums",
    "id,title,description,cover_image,default_visibility,published_at",
    {
      cover_image: input.imageUrl || "",
      created_by_user_id: input.userId,
      default_visibility: input.visibility,
      description: input.description,
      title: input.title
    }
  );
  const album = mapAlbum(albumRow);
  const photoRow = await postReturningRow<PhotoRow>(
    "photos",
    "id,album_id,title,image_url,visibility_override,sort_order",
    {
      album_id: album.id,
      image_url: input.imageUrl || "",
      sort_order: 1,
      title: input.photoTitle,
      visibility_override: null
    }
  );

  return {
    album,
    photo: mapPhoto(photoRow)
  };
}

export async function persistVideoCollectionWithVideo(
  input: PersistVideoCollectionWithVideoInput
): Promise<{ collection: VideoCollectionRecord; video: VideoRecord }> {
  const thumbnailUrl = input.thumbnailUrl || "";
  const collectionRow = await postReturningRow<VideoCollectionRow>(
    "video_collections",
    "id,title,description,cover_image,default_visibility,published_at",
    {
      cover_image: thumbnailUrl,
      created_by_user_id: input.userId,
      default_visibility: input.visibility,
      description: input.description,
      title: input.title
    }
  );
  const collection = mapVideoCollection(collectionRow);
  const videoRow = await postReturningRow<VideoRow>(
    "videos",
    "id,collection_id,title,description,cloudinary_public_id,playback_url,thumbnail_url,visibility_override,processing_state,sort_order",
    {
      cloudinary_public_id: input.cloudinaryPublicId || `manual/${collection.id}`,
      collection_id: collection.id,
      description: input.description,
      playback_url: input.playbackUrl || "",
      processing_state: "ready",
      sort_order: 1,
      thumbnail_url: thumbnailUrl,
      title: input.videoTitle,
      visibility_override: null
    }
  );

  return {
    collection,
    video: mapVideo(videoRow)
  };
}
