export type JavaRole = "USER" | "ADMIN" | "SUPER_ADMIN";
export type JavaMemberLevel = "NORMAL" | "GOLD" | "DIAMOND";
export type JavaUserStatus = "ACTIVE" | "DISABLED";
export type JavaInviteStatus = "ACTIVE" | "DISABLED";
export type JavaContentVisibility = "PUBLIC" | "NORMAL" | "GOLD" | "DIAMOND";
export type JavaContentStatus = "PUBLISHED" | "DRAFT" | "SCHEDULED";
export type JavaMediaType = "IMAGE" | "VIDEO";

export class JavaApiError extends Error {
  readonly errorCode: string;
  readonly status: number;

  constructor(message: string, errorCode: string, status: number) {
    super(message);
    this.name = "JavaApiError";
    this.errorCode = errorCode;
    this.status = status;
  }
}

export type JavaUser = {
  displayName: string;
  email: string;
  id: string;
  memberLevel: JavaMemberLevel;
  role: JavaRole;
  username: string;
};

export type JavaAdminUser = JavaUser & {
  status: JavaUserStatus;
};

export type JavaAdminUserPage = {
  page: number;
  size: number;
  total: number;
  totalPages: number;
  users: JavaAdminUser[];
};

export type ListAdminUsersInput = {
  page?: number;
  q?: string;
  size?: number;
};

export type JavaAdminAuditLog = {
  actionType: string;
  adminDisplayName: string;
  adminUserId: string;
  adminUsername: string;
  createdAt: string;
  detailJson: string;
  id: string;
  targetId: string | null;
  targetType: string;
};

export type JavaAdminAuditLogPage = {
  items: JavaAdminAuditLog[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
};

export type ListAdminAuditLogsInput = {
  page?: number;
  size?: number;
};

export type JavaInvite = {
  code: string;
  expiresAt?: string | null;
  id: string;
  initialLevel: JavaMemberLevel;
  maxUses: number;
  status: JavaInviteStatus;
  usedCount: number;
};

export type JavaMediaAsset = {
  createdAt: string;
  id: string;
  mediaType: JavaMediaType;
  mimeType: string;
  objectKey: string;
  originalName: string;
  sizeBytes: number;
};

export type JavaMediaAssetPage = {
  items: JavaMediaAsset[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
};

export type ListMediaInput = {
  mediaType?: JavaMediaType;
  page?: number;
  q?: string;
  size?: number;
};

export type JavaMediaAccess = {
  expiresAt: string;
  url: string;
};

export type JavaDirectUploadRequest = {
  mediaType: JavaMediaType;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
};

export type JavaDirectUpload = {
  bucketName: string;
  expiresAt: string;
  mediaType: JavaMediaType;
  mimeType: string;
  objectKey: string;
  uploadUrl: string;
};

export type JavaCompleteDirectUploadRequest = JavaDirectUploadRequest & {
  bucketName: string;
  objectKey: string;
};

export type JavaPost = {
  category: string | null;
  content: string;
  id: string;
  mediaAssetIds: string[];
  pinned: boolean;
  publishedAt: string | null;
  scheduledAt: string | null;
  status: JavaContentStatus;
  tags: string[];
  title: string;
  visibility: JavaContentVisibility;
};

export type JavaAlbum = {
  category: string | null;
  coverMediaId: string | null;
  description: string;
  id: string;
  publishedAt: string | null;
  scheduledAt: string | null;
  status: JavaContentStatus;
  tags: string[];
  title: string;
  visibility: JavaContentVisibility;
};

export type JavaVideo = {
  category: string | null;
  coverMediaId: string | null;
  description: string;
  id: string;
  mediaAssetId: string;
  publishedAt: string | null;
  scheduledAt: string | null;
  status: JavaContentStatus;
  tags: string[];
  title: string;
  visibility: JavaContentVisibility;
};

export type JavaContentFeed = {
  albums: JavaAlbum[];
  posts: JavaPost[];
  videos: JavaVideo[];
};

export type JavaSiteSettings = {
  logoMark: string;
  logoText: string;
  siteName: string;
  updatedAt: string;
};

export type JavaContentPage<T> = {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
};

export type ListContentPageInput = {
  category?: string;
  page?: number;
  q?: string;
  size?: number;
  sort?: "latest" | "oldest" | "title";
  tag?: string;
};

export type LoginInput = {
  account: string;
  password: string;
};

export type RegisterInput = {
  email: string;
  inviteCode: string;
  password: string;
  username: string;
};

export type CreateInviteInput = {
  code: string;
  expiresAt?: string | null;
  initialLevel: JavaMemberLevel;
  maxUses: number;
};

export type UpdateUserInput = {
  disabled: boolean;
  memberLevel: JavaMemberLevel;
  userId: string;
};

export type UpdateSiteSettingsInput = {
  logoMark: string;
  logoText: string;
  siteName: string;
};

export type CreatePostInput = {
  category?: string;
  content: string;
  mediaAssetIds?: string[];
  pinned?: boolean;
  status?: JavaContentStatus;
  scheduledAt?: string | null;
  tags?: string[];
  title: string;
  visibility: JavaContentVisibility;
};

export type CreateAlbumInput = {
  category?: string;
  coverMediaId?: string;
  description: string;
  status?: JavaContentStatus;
  scheduledAt?: string | null;
  tags?: string[];
  title: string;
  visibility: JavaContentVisibility;
};

export type CreateVideoInput = {
  category?: string;
  coverMediaId?: string;
  description: string;
  mediaAssetId: string;
  status?: JavaContentStatus;
  scheduledAt?: string | null;
  tags?: string[];
  title: string;
  visibility: JavaContentVisibility;
};

export type UpdatePostInput = CreatePostInput & {
  id: string;
};

export type UpdateAlbumInput = CreateAlbumInput & {
  id: string;
};

export type UpdateVideoInput = {
  category?: string;
  coverMediaId?: string;
  description: string;
  id: string;
  mediaAssetId?: string;
  status?: JavaContentStatus;
  scheduledAt?: string | null;
  tags?: string[];
  title: string;
  visibility: JavaContentVisibility;
};

export async function login(input: LoginInput): Promise<JavaUser> {
  return request<JavaUser>("/api/auth/login", {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export async function register(input: RegisterInput): Promise<JavaUser> {
  return request<JavaUser>("/api/auth/register", {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export async function getMe(): Promise<JavaUser> {
  return request<JavaUser>("/api/auth/me", { method: "GET" });
}

export async function logout(): Promise<void> {
  await request<void>("/api/auth/logout", { method: "POST" });
}

export async function createInvite(input: CreateInviteInput): Promise<JavaInvite> {
  return request<JavaInvite>("/api/admin/invites", {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export async function listInvites(): Promise<JavaInvite[]> {
  return request<JavaInvite[]>("/api/admin/invites", { method: "GET" });
}

export async function listAdminUsers(input: ListAdminUsersInput = {}): Promise<JavaAdminUserPage> {
  const params = new URLSearchParams();
  if (input.page !== undefined) {
    params.set("page", String(input.page));
  }
  if (input.size !== undefined) {
    params.set("size", String(input.size));
  }
  if (input.q?.trim()) {
    params.set("q", input.q.trim());
  }
  const query = params.toString();
  return request<JavaAdminUserPage>(`/api/admin/users${query ? `?${query}` : ""}`, { method: "GET" });
}

export async function listAdminAuditLogs(input: ListAdminAuditLogsInput = {}): Promise<JavaAdminAuditLogPage> {
  const params = new URLSearchParams();
  if (input.page !== undefined) {
    params.set("page", String(input.page));
  }
  if (input.size !== undefined) {
    params.set("size", String(input.size));
  }
  const query = params.toString();
  return request<JavaAdminAuditLogPage>(`/api/admin/audit-logs${query ? `?${query}` : ""}`, { method: "GET" });
}

export async function deleteInvite(inviteId: string): Promise<void> {
  await request<void>(`/api/admin/invites/${encodeURIComponent(inviteId)}`, { method: "DELETE" });
}

export async function updateUser(input: UpdateUserInput): Promise<JavaAdminUser> {
  return request<JavaAdminUser>(`/api/admin/users/${encodeURIComponent(input.userId)}`, {
    body: JSON.stringify({
      disabled: input.disabled,
      memberLevel: input.memberLevel
    }),
    method: "PATCH"
  });
}

export async function listContent(): Promise<JavaContentFeed> {
  return request<JavaContentFeed>("/api/content", { method: "GET" });
}

export async function getSiteSettings(): Promise<JavaSiteSettings> {
  return request<JavaSiteSettings>("/api/admin/site-settings", { method: "GET" });
}

export async function updateSiteSettings(input: UpdateSiteSettingsInput): Promise<JavaSiteSettings> {
  return request<JavaSiteSettings>("/api/admin/site-settings", {
    body: JSON.stringify(input),
    method: "PATCH"
  });
}

export async function listPosts(input: ListContentPageInput = {}): Promise<JavaContentPage<JavaPost>> {
  return request<JavaContentPage<JavaPost>>(contentPagePath("/api/content/posts", input), { method: "GET" });
}

export async function listAlbums(input: ListContentPageInput = {}): Promise<JavaContentPage<JavaAlbum>> {
  return request<JavaContentPage<JavaAlbum>>(contentPagePath("/api/content/albums", input), { method: "GET" });
}

export async function listVideos(input: ListContentPageInput = {}): Promise<JavaContentPage<JavaVideo>> {
  return request<JavaContentPage<JavaVideo>>(contentPagePath("/api/content/videos", input), { method: "GET" });
}

export async function getPost(postId: string): Promise<JavaPost> {
  return request<JavaPost>(`/api/content/posts/${encodeURIComponent(postId)}`, { method: "GET" });
}

export async function getAlbum(albumId: string): Promise<JavaAlbum> {
  return request<JavaAlbum>(`/api/content/albums/${encodeURIComponent(albumId)}`, { method: "GET" });
}

export async function getVideo(videoId: string): Promise<JavaVideo> {
  return request<JavaVideo>(`/api/content/videos/${encodeURIComponent(videoId)}`, { method: "GET" });
}

export async function createPost(input: CreatePostInput): Promise<JavaPost> {
  return request<JavaPost>("/api/content/posts", {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export async function createAlbum(input: CreateAlbumInput): Promise<JavaAlbum> {
  return request<JavaAlbum>("/api/content/albums", {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export async function createVideo(input: CreateVideoInput): Promise<JavaVideo> {
  return request<JavaVideo>("/api/content/videos", {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export async function updatePost(input: UpdatePostInput): Promise<JavaPost> {
  return request<JavaPost>(`/api/content/posts/${encodeURIComponent(input.id)}`, {
    body: JSON.stringify({
      category: input.category,
      content: input.content,
      mediaAssetIds: input.mediaAssetIds,
      pinned: input.pinned,
      status: input.status,
      scheduledAt: input.scheduledAt,
      tags: input.tags,
      title: input.title,
      visibility: input.visibility
    }),
    method: "PATCH"
  });
}

export async function updateAlbum(input: UpdateAlbumInput): Promise<JavaAlbum> {
  return request<JavaAlbum>(`/api/content/albums/${encodeURIComponent(input.id)}`, {
    body: JSON.stringify({
      category: input.category,
      coverMediaId: input.coverMediaId,
      description: input.description,
      status: input.status,
      scheduledAt: input.scheduledAt,
      tags: input.tags,
      title: input.title,
      visibility: input.visibility
    }),
    method: "PATCH"
  });
}

export async function updateVideo(input: UpdateVideoInput): Promise<JavaVideo> {
  return request<JavaVideo>(`/api/content/videos/${encodeURIComponent(input.id)}`, {
    body: JSON.stringify({
      category: input.category,
      coverMediaId: input.coverMediaId,
      description: input.description,
      mediaAssetId: input.mediaAssetId,
      status: input.status,
      scheduledAt: input.scheduledAt,
      tags: input.tags,
      title: input.title,
      visibility: input.visibility
    }),
    method: "PATCH"
  });
}

export async function deletePost(postId: string): Promise<void> {
  await request<void>(`/api/content/posts/${encodeURIComponent(postId)}`, { method: "DELETE" });
}

export async function deleteAlbum(albumId: string): Promise<void> {
  await request<void>(`/api/content/albums/${encodeURIComponent(albumId)}`, { method: "DELETE" });
}

export async function deleteVideo(videoId: string): Promise<void> {
  await request<void>(`/api/content/videos/${encodeURIComponent(videoId)}`, { method: "DELETE" });
}

export async function uploadImage(file: File): Promise<JavaMediaAsset> {
  return uploadMedia("/api/media/images", file);
}

export async function uploadVideo(file: File): Promise<JavaMediaAsset> {
  return uploadMedia("/api/media/videos", file);
}

export async function createDirectUpload(input: JavaDirectUploadRequest): Promise<JavaDirectUpload> {
  return request<JavaDirectUpload>("/api/media/direct-uploads", {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export async function completeDirectUpload(input: JavaCompleteDirectUploadRequest): Promise<JavaMediaAsset> {
  return request<JavaMediaAsset>("/api/media/direct-uploads/complete", {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export async function listMedia(input: ListMediaInput = {}): Promise<JavaMediaAssetPage> {
  const params = new URLSearchParams();
  if (input.mediaType) {
    params.set("mediaType", input.mediaType);
  }
  if (input.page !== undefined) {
    params.set("page", String(input.page));
  }
  if (input.size !== undefined) {
    params.set("size", String(input.size));
  }
  if (input.q?.trim()) {
    params.set("q", input.q.trim());
  }
  const query = params.toString();
  return request<JavaMediaAssetPage>(`/api/media${query ? `?${query}` : ""}`, { method: "GET" });
}

export async function getMediaAccess(mediaId: string): Promise<JavaMediaAccess> {
  return request<JavaMediaAccess>(`/api/media/${encodeURIComponent(mediaId)}/access`, { method: "GET" });
}

async function uploadMedia(path: string, file: File): Promise<JavaMediaAsset> {
  const formData = new FormData();
  formData.append("file", file);
  return request<JavaMediaAsset>(path, {
    body: formData,
    method: "POST"
  });
}

function contentPagePath(path: string, input: ListContentPageInput): string {
  const params = new URLSearchParams();
  if (input.page !== undefined) {
    params.set("page", String(input.page));
  }
  if (input.size !== undefined) {
    params.set("size", String(input.size));
  }
  if (input.q?.trim()) {
    params.set("q", input.q.trim());
  }
  if (input.category?.trim()) {
    params.set("category", input.category.trim());
  }
  if (input.tag?.trim()) {
    params.set("tag", input.tag.trim());
  }
  if (input.sort) {
    params.set("sort", input.sort);
  }
  const query = params.toString();
  return `${path}${query ? `?${query}` : ""}`;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (isUnsafeMethod(init.method) && !headers.has("X-XSRF-TOKEN")) {
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) {
      headers.set("X-XSRF-TOKEN", csrfToken);
    }
  }

  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorBody = body as { errorCode?: string; message?: string };
    throw new JavaApiError(
      errorBody.message || "请求失败，请稍后重试",
      errorBody.errorCode || "REQUEST_FAILED",
      response.status
    );
  }

  return body as T;
}

function isUnsafeMethod(method: string | undefined): boolean {
  const normalized = (method ?? "GET").toUpperCase();
  return normalized !== "GET" && normalized !== "HEAD" && normalized !== "OPTIONS" && normalized !== "TRACE";
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const prefix = `${encodeURIComponent(name)}=`;
  for (const part of document.cookie.split(";")) {
    const cookie = part.trim();
    if (cookie.startsWith(prefix)) {
      return decodeURIComponent(cookie.slice(prefix.length));
    }
  }

  return null;
}

async function ensureCsrfToken(): Promise<string | null> {
  const existingToken = readCookie("XSRF-TOKEN");
  if (existingToken) {
    return existingToken;
  }

  if (typeof document === "undefined") {
    return null;
  }

  if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
    return null;
  }

  try {
    await fetch("/api/auth/csrf", { credentials: "include", method: "GET" });
  } catch {
    return readCookie("XSRF-TOKEN");
  }
  return readCookie("XSRF-TOKEN");
}
