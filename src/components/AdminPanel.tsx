"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Cloud,
  Database,
  FileUp,
  History,
  KeyRound,
  Pencil,
  Pin,
  ShieldCheck,
  Trash2,
  Upload,
  Search,
  UsersRound,
  Image,
  Video
} from "lucide-react";
import { canManage, type MembershipLevel } from "@/domain/membership";
import { formatCategoryLabel } from "@/i18n/category-labels";
import type { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/routing";
import {
  uploadImageFile,
  uploadVideoFile,
  type UploadedImage,
  type UploadedVideo,
  type UploadProgress
} from "@/services/admin-upload-client";
import {
  JavaApiError,
  listAdminAuditLogs,
  listMedia,
  type JavaAdminAuditLog,
  type JavaMediaAsset,
  type JavaMediaType
} from "@/services/java-api-client";
import { useAppAdminState } from "@/state/AppStateProvider";
import type { ContentRecordStatus } from "@/data/mock-data";

type Dictionary = ReturnType<typeof getDictionary>;
type EditableLevel = Exclude<MembershipLevel, "public">;
type ContentKind = "post" | "album" | "video";
type UploadTarget = "image" | "video" | "cover";
type MediaUseTarget = "image" | "video" | "cover";
type ContentLibraryKindFilter = ContentKind | "ALL";
type ContentLibraryLevelFilter = MembershipLevel | "ALL";
type EditingContent = {
  id: string;
  kind: ContentKind;
} | null;

type ContentLibraryRow = {
  body: string;
  category: string;
  date: string;
  id: string;
  kind: ContentKind;
  level: MembershipLevel;
  pinned?: boolean;
  status: ContentRecordStatus;
  tags: string[];
  title: string;
};

function formatCount(count: number, unit: string) {
  return `${count} ${unit}`;
}

function uploadErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof JavaApiError && (error.status === 401 || error.errorCode === "UNAUTHENTICATED")) {
    return fallback;
  }

  if (error instanceof Error && error.message.trim()) {
    return `${fallback}${dictionarySeparator(fallback)}${error.message}`;
  }

  return fallback;
}

function adminActionErrorMessage(error: unknown, dictionary: Dictionary, fallback: string): string {
  if (error instanceof JavaApiError) {
    if (error.status === 401 || error.errorCode === "UNAUTHENTICATED") {
      return dictionary.admin.adminAccessRequired;
    }

    if (error.status === 403 || error.errorCode === "ADMIN_REQUIRED") {
      return dictionary.admin.adminPermissionRequired;
    }
  }

  return uploadErrorMessage(error, fallback);
}

function dictionarySeparator(value: string) {
  return /[。？！.!?]$/.test(value.trim()) ? " " : ": ";
}

function bodyLabelFor(kind: ContentKind, dictionary: Dictionary) {
  if (kind === "album") {
    return dictionary.admin.albumDescription;
  }

  if (kind === "video") {
    return dictionary.admin.videoDescription;
  }

  return dictionary.admin.postBody;
}

function titlePlaceholderFor(kind: ContentKind, dictionary: Dictionary) {
  if (kind === "album") {
    return `${dictionary.content.albums}${dictionary.admin.titleLabel}`;
  }

  if (kind === "video") {
    return `${dictionary.content.videos}${dictionary.admin.titleLabel}`;
  }

  return `${dictionary.content.posts}${dictionary.admin.titleLabel}`;
}

function latestPublishedAt(items: Array<{ publishedAt?: string }>, fallback: string) {
  const latest = items
    .map((item) => item.publishedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  return latest ?? fallback;
}

function contentStatusLabel(status: ContentRecordStatus, dictionary: Dictionary) {
  if (status === "draft") return dictionary.admin.draftContent;
  if (status === "scheduled") return dictionary.admin.scheduledContent;
  return dictionary.admin.publishedContent;
}

function memberPageSummary(template: string, input: { page: number; total: number; totalPages: number }) {
  return template
    .replace("{page}", String(input.page))
    .replace("{totalPages}", String(input.totalPages))
    .replace("{total}", String(input.total));
}

function mediaPageSummary(template: string, input: { page: number; total: number; totalPages: number }) {
  return memberPageSummary(template, input);
}

function auditPageSummary(template: string, input: { page: number; total: number; totalPages: number }) {
  return memberPageSummary(template, input);
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}

function normalizeMediaPage(page: unknown, fallbackSize: number) {
  const candidate = page as Partial<{
    items: JavaMediaAsset[];
    page: number;
    size: number;
    total: number;
    totalPages: number;
  }>;

  return {
    items: Array.isArray(candidate.items) ? candidate.items : [],
    page: typeof candidate.page === "number" ? candidate.page : 0,
    size: typeof candidate.size === "number" ? candidate.size : fallbackSize,
    total: typeof candidate.total === "number" ? candidate.total : 0,
    totalPages: typeof candidate.totalPages === "number" ? candidate.totalPages : 1
  };
}

function normalizeAuditPage(page: unknown, fallbackSize: number) {
  const candidate = page as Partial<{
    items: JavaAdminAuditLog[];
    page: number;
    size: number;
    total: number;
    totalPages: number;
  }>;

  return {
    items: Array.isArray(candidate.items) ? candidate.items : [],
    page: typeof candidate.page === "number" ? candidate.page : 0,
    size: typeof candidate.size === "number" ? candidate.size : fallbackSize,
    total: typeof candidate.total === "number" ? candidate.total : 0,
    totalPages: typeof candidate.totalPages === "number" ? candidate.totalPages : 1
  };
}

function formatAuditDetail(detailJson: string) {
  try {
    const parsed = JSON.parse(detailJson) as Record<string, unknown>;
    return Object.entries(parsed)
      .map(([key, value]) => {
        if (key === "code") return `邀请码 ${String(value)}`;
        if (key === "initialLevel" || key === "memberLevel") return `等级 ${String(value)}`;
        if (key === "status") return `状态 ${String(value)}`;
        if (key === "siteName") return `站点名称 ${String(value)}`;
        if (key === "logoText") return `页眉文字 ${String(value)}`;
        if (key === "logoMark") return `页眉标记 ${String(value)}`;
        if (key === "mediaAssetId" || key === "targetId") return `资源 ${String(value)}`;
        return `${key} ${String(value)}`;
      })
      .join(" / ");
  } catch {
    return detailJson;
  }
}

function formatAuditDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function uploadPhaseLabel(progress: UploadProgress, dictionary: Dictionary) {
  if (progress.phase === "preparing") return dictionary.admin.uploadPreparing;
  if (progress.phase === "finalizing") return dictionary.admin.uploadFinalizing;
  if (progress.phase === "fallback") return dictionary.admin.uploadFallback;
  if (progress.phase === "complete") return dictionary.admin.uploadComplete;
  return dictionary.admin.uploading;
}

function uploadTargetLabel(target: UploadTarget | null, dictionary: Dictionary) {
  if (target === "cover") return dictionary.admin.coverFile;
  if (target === "video") return dictionary.admin.uploadVideoFile;
  if (target === "image") return dictionary.admin.uploadImageFile;
  return dictionary.admin.mediaUpload;
}

function contentKindLabel(kind: ContentKind, dictionary: Dictionary) {
  if (kind === "album") return dictionary.content.album;
  if (kind === "video") return dictionary.content.videoCollection;
  return dictionary.content.post;
}

function contentLibrarySummary(template: string, input: { shown: number; total: number }) {
  return template
    .replace("{shown}", String(input.shown))
    .replace("{total}", String(input.total));
}

function contentBulkSummary(template: string, input: { count: number }) {
  return template.replace("{count}", String(input.count));
}

function contentLibraryRowKey(row: Pick<ContentLibraryRow, "id" | "kind">) {
  return `${row.kind}:${row.id}`;
}

function parseTagInput(value: string): string[] {
  return Array.from(new Set(value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean)));
}

function formatTags(tags: string[]) {
  return tags.join(", ");
}

function formatScheduledPreview(value: string) {
  if (!value.trim()) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function fromDateTimeLocalValue(value: string) {
  if (!value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function AdminPanel({ dictionary, locale = "zh" }: { dictionary: Dictionary; locale?: Locale }) {
  const {
    siteSettings,
    updateSiteSettings,
    users,
    adminUserPage,
    invites,
    posts,
    albums,
    photos,
    videoCollections,
    videos,
    currentUser,
    authSession,
    authReady,
    loadAdminUsersPage,
    updateUserLevel,
    toggleUserDisabled,
    generateInvite,
    deleteInvite,
    publishPost,
    createAlbumWithPhoto,
    createVideoCollectionWithVideo,
    updatePost,
    updateAlbum,
    updateVideoCollection,
    deleteContent
  } = useAppAdminState();
  const [newInviteLevel, setNewInviteLevel] = useState<EditableLevel>("normal");
  const [newInviteExpiresAt, setNewInviteExpiresAt] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [brandDraft, setBrandDraft] = useState({
    logoMark: siteSettings.logoMark,
    logoText: siteSettings.logoText,
    siteName: siteSettings.siteName
  });
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandMessage, setBrandMessage] = useState<string | null>(null);
  const [contentKind, setContentKind] = useState<ContentKind>("post");
  const [contentTitle, setContentTitle] = useState("");
  const [contentBody, setContentBody] = useState("");
  const [contentCategory, setContentCategory] = useState("");
  const [contentTags, setContentTags] = useState("");
  const [contentVisibility, setContentVisibility] = useState<MembershipLevel>("gold");
  const [contentStatus, setContentStatus] = useState<ContentRecordStatus>("published");
  const [contentScheduledAt, setContentScheduledAt] = useState("");
  const [contentPinned, setContentPinned] = useState(false);
  const [contentAsset, setContentAsset] = useState("");
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadTarget, setUploadTarget] = useState<UploadTarget | null>(null);
  const [uploadedImageMeta, setUploadedImageMeta] = useState<UploadedImage | null>(null);
  const [uploadedVideoCoverMeta, setUploadedVideoCoverMeta] = useState<UploadedImage | null>(null);
  const [uploadedVideoMeta, setUploadedVideoMeta] = useState<UploadedVideo | null>(null);
  const [editingContent, setEditingContent] = useState<EditingContent>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberPageSize, setMemberPageSize] = useState(10);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [contentLibraryQuery, setContentLibraryQuery] = useState("");
  const [contentLibraryKindFilter, setContentLibraryKindFilter] = useState<ContentLibraryKindFilter>("ALL");
  const [contentLibraryLevelFilter, setContentLibraryLevelFilter] = useState<ContentLibraryLevelFilter>("ALL");
  const [selectedContentKeys, setSelectedContentKeys] = useState<string[]>([]);
  const [bulkContentVisibility, setBulkContentVisibility] = useState<MembershipLevel>("gold");
  const [contentLibraryMessage, setContentLibraryMessage] = useState<string | null>(null);
  const [mediaQuery, setMediaQuery] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<JavaMediaType | "ALL">("ALL");
  const [mediaPage, setMediaPage] = useState({
    items: [] as JavaMediaAsset[],
    page: 0,
    size: 8,
    total: 0,
    totalPages: 1
  });
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [auditPage, setAuditPage] = useState({
    items: [] as JavaAdminAuditLog[],
    page: 0,
    size: 8,
    total: 0,
    totalPages: 1
  });
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const unusedInvites = useMemo(() => invites.filter((invite) => !invite.usedByUserId), [invites]);
  const contentTotal = posts.length + albums.length + videoCollections.length;
  const contentLibraryRows = useMemo<ContentLibraryRow[]>(
    () => [
      ...posts.map((post) => ({
        body: post.body,
        category: post.category,
        date: post.status === "scheduled" ? post.scheduledAt ?? post.publishedAt : post.publishedAt,
        id: post.id,
        kind: "post" as const,
        level: post.visibility,
        pinned: post.pinned,
        status: post.status,
        tags: post.tags,
        title: post.title
      })),
      ...albums.map((album) => ({
        body: album.description,
        category: album.category,
        date: album.status === "scheduled" ? album.scheduledAt ?? album.publishedAt : album.publishedAt,
        id: album.id,
        kind: "album" as const,
        level: album.defaultVisibility,
        status: album.status,
        tags: album.tags,
        title: album.title
      })),
      ...videoCollections.map((collection) => ({
        body: collection.description,
        category: collection.category,
        date: collection.status === "scheduled" ? collection.scheduledAt ?? collection.publishedAt : collection.publishedAt,
        id: collection.id,
        kind: "video" as const,
        level: collection.defaultVisibility,
        status: collection.status,
        tags: collection.tags,
        title: collection.title
      }))
    ],
    [albums, posts, videoCollections]
  );
  const normalizedContentLibraryQuery = useMemo(
    () => contentLibraryQuery.trim().toLowerCase(),
    [contentLibraryQuery]
  );
  const filteredContentLibraryRows = useMemo(
    () =>
      contentLibraryRows
        .filter((row) => contentLibraryKindFilter === "ALL" || row.kind === contentLibraryKindFilter)
        .filter((row) => contentLibraryLevelFilter === "ALL" || row.level === contentLibraryLevelFilter)
        .filter((row) => {
          if (!normalizedContentLibraryQuery) return true;

          return [
            row.title,
            row.body,
            row.category,
            row.tags.join(" "),
            row.date,
            contentKindLabel(row.kind, dictionary),
            contentStatusLabel(row.status, dictionary),
            dictionary.membership[row.level],
            row.pinned ? dictionary.admin.pinnedPost : ""
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedContentLibraryQuery);
        })
        .sort(
          (left, right) =>
            Number(Boolean(right.pinned)) - Number(Boolean(left.pinned))
            || right.date.localeCompare(left.date)
            || left.title.localeCompare(right.title)
        ),
    [contentLibraryKindFilter, contentLibraryLevelFilter, contentLibraryRows, dictionary, normalizedContentLibraryQuery]
  );
  const contentLibraryFilteredSummary = useMemo(
    () =>
      contentLibrarySummary(dictionary.admin.contentFilterSummary, {
        shown: filteredContentLibraryRows.length,
        total: contentLibraryRows.length
      }),
    [contentLibraryRows.length, dictionary.admin.contentFilterSummary, filteredContentLibraryRows.length]
  );
  const visibleContentKeys = useMemo(
    () => filteredContentLibraryRows.map(contentLibraryRowKey),
    [filteredContentLibraryRows]
  );
  const selectedContentRows = useMemo(
    () => contentLibraryRows.filter((row) => selectedContentKeys.includes(contentLibraryRowKey(row))),
    [contentLibraryRows, selectedContentKeys]
  );
  const selectedContentCount = selectedContentRows.length;
  const allVisibleContentSelected =
    visibleContentKeys.length > 0 && visibleContentKeys.every((key) => selectedContentKeys.includes(key));
  const contentSelectionSummary = contentBulkSummary(dictionary.admin.selectedContent, {
    count: selectedContentCount
  });
  const mediaTotal = photos.length + videos.length;
  const memberRows = adminUserPage.users;
  const memberCurrentPage = adminUserPage.page + 1;
  const memberTotalPages = Math.max(1, adminUserPage.totalPages);
  const memberSummary = memberPageSummary(dictionary.admin.memberPageSummary, {
    page: memberCurrentPage,
    total: adminUserPage.total,
    totalPages: memberTotalPages
  });
  const mediaCurrentPage = mediaPage.page + 1;
  const mediaTotalPages = Math.max(1, mediaPage.totalPages);
  const mediaSummary = mediaPageSummary(dictionary.admin.mediaPageSummary, {
    page: mediaCurrentPage,
    total: mediaPage.total,
    totalPages: mediaTotalPages
  });
  const auditCurrentPage = auditPage.page + 1;
  const auditTotalPages = Math.max(1, auditPage.totalPages);
  const auditSummary = auditPageSummary(dictionary.admin.auditPageSummary, {
    page: auditCurrentPage,
    total: auditPage.total,
    totalPages: auditTotalPages
  });
  const latestContentDate = latestPublishedAt(
    [...posts, ...albums, ...videoCollections],
    dictionary.admin.noDate
  );
  const isUploading = uploadTarget !== null;
  const primaryContentActionLabel =
    contentStatus === "draft"
      ? dictionary.admin.saveDraft
      : contentStatus === "scheduled"
        ? dictionary.admin.scheduleContent
      : editingContent
        ? dictionary.common.save
        : dictionary.common.publish;
  const secondaryContentStatus: ContentRecordStatus = contentStatus === "draft" ? "published" : "draft";
  const secondaryContentActionLabel =
    secondaryContentStatus === "draft"
      ? dictionary.admin.saveDraft
      : editingContent
        ? dictionary.admin.publishChanges
        : dictionary.common.publish;
  const contentPreview = {
    body: contentBody.trim() || dictionary.content.bodyPlaceholder,
    category: contentCategory.trim() || dictionary.admin.contentCategoryPlaceholder,
    coverImage: contentAsset.trim(),
    date:
      contentStatus === "scheduled"
        ? formatScheduledPreview(contentScheduledAt)
        : dictionary.admin.latestUpdate,
    pinned: contentPinned,
    tags: parseTagInput(contentTags),
    title: contentTitle.trim() || titlePlaceholderFor(contentKind, dictionary),
    visibility: contentVisibility
  };

  useEffect(() => {
    setBrandDraft({
      logoMark: siteSettings.logoMark,
      logoText: siteSettings.logoText,
      siteName: siteSettings.siteName
    });
  }, [siteSettings.logoMark, siteSettings.logoText, siteSettings.siteName]);

  async function onSaveSiteSettings() {
    setBrandSaving(true);
    setBrandMessage(null);

    try {
      await updateSiteSettings({
        logoMark: brandDraft.logoMark.trim(),
        logoText: brandDraft.logoText.trim(),
        siteName: brandDraft.siteName.trim()
      });
      setBrandMessage(dictionary.admin.siteBrandSaved);
    } catch {
      setBrandMessage(dictionary.admin.siteBrandSaveFailed);
    } finally {
      setBrandSaving(false);
    }
  }

  function onSiteBrandChange(field: "logoMark" | "logoText" | "siteName", value: string) {
    setBrandDraft((current) => ({
      ...current,
      [field]: value
    }));
    setBrandMessage(null);
  }

  useEffect(() => {
    if (!authReady) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setMemberLoading(true);
      setMemberError(null);
      void loadAdminUsersPage({ page: 0, q: memberQuery, size: memberPageSize })
        .catch((error) => {
          if (!cancelled) {
            setMemberError(adminActionErrorMessage(error, dictionary, dictionary.admin.noMembers));
          }
        })
        .finally(() => {
          if (!cancelled) {
            setMemberLoading(false);
          }
        });
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [authReady, authSession?.accessToken, memberPageSize, memberQuery]);

  useEffect(() => {
    if (!authReady || !authSession?.accessToken) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setMediaLoading(true);
      setMediaError(null);
      void listMedia({
        mediaType: mediaTypeFilter === "ALL" ? undefined : mediaTypeFilter,
        page: 0,
        q: mediaQuery,
        size: mediaPage.size
      })
        .then((page) => {
          if (!cancelled) {
            setMediaPage(normalizeMediaPage(page, mediaPage.size));
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setMediaError(adminActionErrorMessage(error, dictionary, dictionary.admin.noMediaAssets));
          }
        })
        .finally(() => {
          if (!cancelled) {
            setMediaLoading(false);
          }
        });
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [authReady, authSession?.accessToken, mediaPage.size, mediaQuery, mediaTypeFilter]);

  useEffect(() => {
    if (!authReady || !authSession?.accessToken) {
      return;
    }

    let cancelled = false;
    setAuditLoading(true);
    setAuditError(null);
    void listAdminAuditLogs({ page: 0, size: auditPage.size })
      .then((page) => {
        if (!cancelled) {
          setAuditPage(normalizeAuditPage(page, auditPage.size));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAuditError(adminActionErrorMessage(error, dictionary, dictionary.admin.noAuditLogs));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAuditLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, authSession?.accessToken, auditPage.size]);

  if (!authReady) {
    return (
      <section className="locked-state">
        <div>
          <h2>{dictionary.admin.loading}</h2>
          <p className="muted">{dictionary.admin.title}</p>
        </div>
      </section>
    );
  }

  if (!canManage(currentUser ? { level: currentUser.level, disabled: currentUser.disabled, isAdmin: currentUser.isAdmin } : null)) {
    return (
      <section className="locked-state">
        <div>
          <h2>{dictionary.membership.locked}</h2>
          <p className="muted">{dictionary.admin.title}</p>
        </div>
      </section>
    );
  }

  async function onGenerateInvite() {
    setGeneratedCode(await generateInvite(newInviteLevel, fromDateTimeLocalValue(newInviteExpiresAt)));
  }

  async function onLoadMemberPage(page: number) {
    setMemberLoading(true);
    setMemberError(null);

    try {
      await loadAdminUsersPage({ page, q: memberQuery, size: memberPageSize });
    } catch (error) {
      setMemberError(adminActionErrorMessage(error, dictionary, dictionary.admin.noMembers));
    } finally {
      setMemberLoading(false);
    }
  }

  async function onLoadMediaPage(page: number) {
    if (!authSession?.accessToken) {
      setMediaError(dictionary.admin.uploadNeedsLogin);
      return;
    }

    setMediaLoading(true);
    setMediaError(null);

    try {
      const nextPage = await listMedia({
        mediaType: mediaTypeFilter === "ALL" ? undefined : mediaTypeFilter,
        page,
        q: mediaQuery,
        size: mediaPage.size
      });
      setMediaPage(normalizeMediaPage(nextPage, mediaPage.size));
    } catch (error) {
      setMediaError(adminActionErrorMessage(error, dictionary, dictionary.admin.noMediaAssets));
    } finally {
      setMediaLoading(false);
    }
  }

  async function onLoadAuditPage(page: number) {
    if (!authSession?.accessToken) {
      setAuditError(dictionary.admin.uploadNeedsLogin);
      return;
    }

    setAuditLoading(true);
    setAuditError(null);

    try {
      const nextPage = await listAdminAuditLogs({ page, size: auditPage.size });
      setAuditPage(normalizeAuditPage(nextPage, auditPage.size));
    } catch (error) {
      setAuditError(adminActionErrorMessage(error, dictionary, dictionary.admin.noAuditLogs));
    } finally {
      setAuditLoading(false);
    }
  }

  function onChangeContentKind(kind: ContentKind) {
    setContentKind(kind);
    setUploadMessage(null);
    setUploadProgress(null);
    setUploadTarget(null);
    setUploadedImageMeta(null);
    setUploadedVideoCoverMeta(null);
    setUploadedVideoMeta(null);
    setEditingContent(null);
    setContentStatus("published");
    setContentPinned(false);
  }

  async function onUploadImageFile(file: File | undefined) {
    if (!file) {
      return;
    }

    if (isUploading) {
      return;
    }

    if (!authSession?.accessToken) {
      setUploadMessage(dictionary.admin.uploadNeedsLogin);
      return;
    }

    const target: UploadTarget = contentKind === "video" ? "cover" : "image";
    setUploadTarget(target);
    setUploadProgress({ percent: 0, phase: "preparing" });
    setUploadMessage(dictionary.admin.uploading);

    try {
      const uploaded = await uploadImageFile({
        accessToken: authSession.accessToken,
        file,
        onProgress: setUploadProgress,
        visibility: contentVisibility
      });
      if (contentKind === "video") {
        setUploadedVideoCoverMeta(uploaded);
        setUploadMessage(dictionary.admin.videoCoverUploadedReady);
      } else {
        setContentAsset(uploaded.publicUrl);
        setUploadedImageMeta(uploaded);
        setUploadMessage(dictionary.admin.imageUploadedReady);
      }
    } catch (error) {
      setUploadMessage(uploadErrorMessage(error, dictionary.admin.uploadFailed));
    } finally {
      setUploadTarget(null);
    }
  }

  function onUseMedia(asset: JavaMediaAsset, target: MediaUseTarget) {
    const publicUrl = `/api/media/${encodeURIComponent(asset.id)}/view`;

    if (target === "cover") {
      if (contentKind !== "video") {
        setContentAsset(publicUrl);
        setUploadedImageMeta({
          mediaAssetId: asset.id,
          path: asset.objectKey,
          publicUrl
        });
        setUploadMessage(dictionary.admin.mediaLibraryCoverSelected);
        return;
      }

      setUploadedVideoCoverMeta({
        mediaAssetId: asset.id,
        path: asset.objectKey,
        publicUrl
      });
      setUploadMessage(dictionary.admin.mediaLibraryCoverSelected);
      return;
    }

    if (target === "video") {
      setContentAsset(publicUrl);
      setUploadedVideoMeta({
        mediaAssetId: asset.id,
        playbackUrl: publicUrl,
        thumbnailUrl: uploadedVideoCoverMeta?.publicUrl || ""
      });
      setUploadMessage(dictionary.admin.mediaLibraryVideoSelected);
      return;
    }

    setContentAsset(publicUrl);
    setUploadedImageMeta({
      mediaAssetId: asset.id,
      path: asset.objectKey,
      publicUrl
    });
    setUploadMessage(dictionary.admin.mediaLibraryImageSelected);
  }

  async function onUploadVideoFile(file: File | undefined) {
    if (!file) {
      return;
    }

    if (isUploading) {
      return;
    }

    if (!authSession?.accessToken) {
      setUploadMessage(dictionary.admin.uploadNeedsLogin);
      return;
    }

    if (contentVisibility === "public") {
      setUploadMessage(dictionary.admin.videoUploadNeedsMemberLevel);
      return;
    }

    setUploadTarget("video");
    setUploadProgress({ percent: 0, phase: "preparing" });
    setUploadMessage(dictionary.admin.uploading);

    try {
      const uploaded = await uploadVideoFile({
        accessToken: authSession.accessToken,
        collectionId: `draft-video-${Date.now()}`,
        file,
        onProgress: setUploadProgress,
        visibility: contentVisibility
      });
      setContentAsset(uploaded.playbackUrl);
      setUploadedVideoMeta(uploaded);
      setUploadMessage(dictionary.admin.videoUploadedReady);
    } catch (error) {
      setUploadMessage(uploadErrorMessage(error, dictionary.admin.uploadFailed));
    } finally {
      setUploadTarget(null);
    }
  }

  function resetContentForm() {
    setContentTitle("");
    setContentBody("");
    setContentCategory("");
    setContentTags("");
    setContentAsset("");
    setUploadedImageMeta(null);
    setUploadedVideoCoverMeta(null);
    setUploadedVideoMeta(null);
    setContentPinned(false);
    setContentStatus("published");
    setContentScheduledAt("");
    setUploadMessage(null);
    setUploadProgress(null);
    setUploadTarget(null);
    setEditingContent(null);
  }

  function onEditContent(nextEditing: Exclude<EditingContent, null>) {
    setEditingContent(nextEditing);
    setContentKind(nextEditing.kind);
    setPublishMessage(null);
    setUploadMessage(null);
    setUploadProgress(null);
    setUploadTarget(null);
    setUploadedImageMeta(null);
    setUploadedVideoCoverMeta(null);
    setUploadedVideoMeta(null);

    if (nextEditing.kind === "post") {
      const post = posts.find((candidate) => candidate.id === nextEditing.id);

      if (post) {
        setContentTitle(post.title);
        setContentBody(post.body);
        setContentCategory(post.category);
        setContentTags(formatTags(post.tags));
        setContentVisibility(post.visibility);
        setContentAsset(post.coverImage);
        setContentPinned(post.pinned);
        setContentStatus(post.status);
        setContentScheduledAt(post.scheduledAt ?? "");
      }
      return;
    }

    if (nextEditing.kind === "album") {
      const album = albums.find((candidate) => candidate.id === nextEditing.id);

      if (album) {
        setContentTitle(album.title);
        setContentBody(album.description);
        setContentCategory(album.category);
        setContentTags(formatTags(album.tags));
        setContentVisibility(album.defaultVisibility);
        setContentAsset(album.coverImage);
        setContentStatus(album.status);
        setContentScheduledAt(album.scheduledAt ?? "");
      }
      return;
    }

    const collection = videoCollections.find((candidate) => candidate.id === nextEditing.id);

    if (collection) {
      setContentTitle(collection.title);
      setContentBody(collection.description);
      setContentCategory(collection.category);
      setContentTags(formatTags(collection.tags));
      setContentVisibility(collection.defaultVisibility);
      setContentAsset(collection.coverImage);
      setContentStatus(collection.status);
      setContentScheduledAt(collection.scheduledAt ?? "");
    }
  }

  function onToggleContentRow(row: ContentLibraryRow) {
    const key = contentLibraryRowKey(row);
    setSelectedContentKeys((current) =>
      current.includes(key) ? current.filter((currentKey) => currentKey !== key) : [...current, key]
    );
  }

  function onToggleVisibleContentRows() {
    setSelectedContentKeys((current) => {
      if (allVisibleContentSelected) {
        return current.filter((key) => !visibleContentKeys.includes(key));
      }

      return Array.from(new Set([...current, ...visibleContentKeys]));
    });
  }

  async function onBulkUpdateContentVisibility() {
    if (selectedContentRows.length === 0) return;

    setContentLibraryMessage(null);

    try {
      for (const row of selectedContentRows) {
        if (row.kind === "post") {
          const post = posts.find((candidate) => candidate.id === row.id);
          if (!post) continue;

          await updatePost({
            id: post.id,
            title: post.title,
            body: post.body,
            category: post.category,
            tags: post.tags,
            visibility: bulkContentVisibility,
            coverImage: post.coverImage,
            pinned: post.pinned,
            status: post.status
          });
          continue;
        }

        if (row.kind === "album") {
          const album = albums.find((candidate) => candidate.id === row.id);
          if (!album) continue;

          await updateAlbum({
            id: album.id,
            title: album.title,
            description: album.description,
            category: album.category,
            tags: album.tags,
            defaultVisibility: bulkContentVisibility,
            coverImage: album.coverImage,
            status: album.status
          });
          continue;
        }

        const collection = videoCollections.find((candidate) => candidate.id === row.id);
        if (!collection) continue;

        await updateVideoCollection({
          id: collection.id,
          title: collection.title,
          description: collection.description,
          category: collection.category,
          tags: collection.tags,
          defaultVisibility: bulkContentVisibility,
          coverImage: collection.coverImage,
          status: collection.status
        });
      }

      setContentLibraryMessage(contentBulkSummary(dictionary.admin.bulkActionComplete, {
        count: selectedContentRows.length
      }));
      setSelectedContentKeys([]);
    } catch (error) {
      setContentLibraryMessage(adminActionErrorMessage(error, dictionary, dictionary.admin.bulkActionFailed));
    }
  }

  async function onBulkDeleteContent() {
    if (selectedContentRows.length === 0) return;

    setContentLibraryMessage(null);

    try {
      for (const row of selectedContentRows) {
        await deleteContent({ id: row.id, kind: row.kind });
      }

      setContentLibraryMessage(contentBulkSummary(dictionary.admin.bulkDeleteComplete, {
        count: selectedContentRows.length
      }));
      setSelectedContentKeys([]);
    } catch (error) {
      setContentLibraryMessage(adminActionErrorMessage(error, dictionary, dictionary.admin.bulkActionFailed));
    }
  }

  async function onPublishContent(nextStatus: ContentRecordStatus = contentStatus) {
    if (isUploading) {
      setPublishMessage(dictionary.admin.uploadBlocksPublish);
      return;
    }

    if (nextStatus === "scheduled" && !contentScheduledAt.trim()) {
      setPublishMessage(dictionary.admin.scheduleTimeRequired);
      return;
    }

    setPublishMessage(null);

    try {
      if (editingContent?.kind === "post") {
        await updatePost({
          id: editingContent.id,
          title: contentTitle,
          body: contentBody,
          category: contentCategory,
          tags: parseTagInput(contentTags),
          visibility: contentVisibility,
          coverImage: contentAsset,
          mediaAssetId: uploadedImageMeta?.mediaAssetId,
          pinned: contentPinned,
          scheduledAt: contentScheduledAt ? new Date(contentScheduledAt).toISOString() : undefined,
          status: nextStatus
        });
      } else if (editingContent?.kind === "album") {
        await updateAlbum({
          id: editingContent.id,
          title: contentTitle,
          description: contentBody,
          category: contentCategory,
          tags: parseTagInput(contentTags),
          defaultVisibility: contentVisibility,
          coverImage: contentAsset,
          coverMediaId: uploadedImageMeta?.mediaAssetId,
          scheduledAt: contentScheduledAt ? new Date(contentScheduledAt).toISOString() : undefined,
          status: nextStatus
        });
      } else if (editingContent?.kind === "video") {
        await updateVideoCollection({
          id: editingContent.id,
          title: contentTitle,
          description: contentBody,
          category: contentCategory,
          tags: parseTagInput(contentTags),
          defaultVisibility: contentVisibility,
          coverImage: uploadedVideoCoverMeta?.publicUrl || contentAsset,
          coverMediaId: uploadedVideoCoverMeta?.mediaAssetId,
          scheduledAt: contentScheduledAt ? new Date(contentScheduledAt).toISOString() : undefined,
          status: nextStatus
        });
      } else if (contentKind === "post") {
        await publishPost({
          title: contentTitle,
          body: contentBody,
          category: contentCategory,
          tags: parseTagInput(contentTags),
          visibility: contentVisibility,
          coverImage: contentAsset,
          mediaAssetId: uploadedImageMeta?.mediaAssetId,
          pinned: contentPinned,
          scheduledAt: contentScheduledAt ? new Date(contentScheduledAt).toISOString() : undefined,
          status: nextStatus
        });
      } else if (contentKind === "album") {
        await createAlbumWithPhoto({
          title: contentTitle,
          description: contentBody,
          category: contentCategory,
          tags: parseTagInput(contentTags),
          visibility: contentVisibility,
          photoTitle: contentTitle,
          imageUrl: contentAsset,
          mediaAssetId: uploadedImageMeta?.mediaAssetId,
          scheduledAt: contentScheduledAt ? new Date(contentScheduledAt).toISOString() : undefined,
          status: nextStatus
        });
      } else if (contentKind === "video") {
        await createVideoCollectionWithVideo({
          title: contentTitle,
          description: contentBody,
          category: contentCategory,
          tags: parseTagInput(contentTags),
          visibility: contentVisibility,
          videoTitle: contentTitle,
          playbackUrl: contentAsset,
          mediaAssetId: uploadedVideoMeta?.mediaAssetId,
          coverMediaId: uploadedVideoCoverMeta?.mediaAssetId,
          thumbnailUrl: uploadedVideoCoverMeta?.publicUrl || uploadedVideoMeta?.thumbnailUrl,
          scheduledAt: contentScheduledAt ? new Date(contentScheduledAt).toISOString() : undefined,
          status: nextStatus
        });
      }

      setPublishMessage(nextStatus === "draft" ? dictionary.admin.draftSaved : dictionary.common.status);
      resetContentForm();
    } catch (error) {
      setPublishMessage(uploadErrorMessage(error, dictionary.admin.publishFailed));
    }
  }

  return (
    <div className="admin-dashboard">
      <section className="admin-overview" aria-label={dictionary.admin.overview}>
        <div className="admin-identity">
          <div className="section-heading">
            <ShieldCheck size={20} />
            <div>
              <span className="eyebrow">{dictionary.admin.overview}</span>
              <h2>{dictionary.admin.signedInAs}</h2>
              <p>
                {currentUser?.name}
                {dictionary.common.colon}
                {currentUser?.email}
              </p>
            </div>
          </div>
        </div>
        <div className="admin-stat-strip">
          <div className="admin-stat">
            <span>{dictionary.admin.publishedTotal}</span>
            <strong>{contentTotal}</strong>
          </div>
          <div className="admin-stat">
            <span>{dictionary.admin.mediaTotal}</span>
            <strong>{mediaTotal}</strong>
          </div>
          <div className="admin-stat">
            <span>{dictionary.admin.pendingInvites}</span>
            <strong>{unusedInvites.length}</strong>
          </div>
          <div className="admin-stat">
            <span>{dictionary.admin.memberAccounts}</span>
            <strong>{users.length}</strong>
          </div>
          <div className="admin-stat admin-stat-date">
            <span>{dictionary.admin.latestUpdate}</span>
            <strong>{latestContentDate}</strong>
          </div>
        </div>
      </section>

      <section className="admin-section admin-site-layout" aria-label={dictionary.admin.siteSettings}>
        <div className="admin-site-preview">
          <span className="admin-site-preview-label">{dictionary.admin.siteSettings}</span>
              <div className="admin-site-preview-brand">
                <span className="brand-mark" aria-hidden="true">
                  {brandDraft.logoMark || "绫"}
                </span>
                <div className="admin-site-preview-copy">
                  <strong>{brandDraft.logoText || "绫奈"}</strong>
                  <p>{brandDraft.siteName || "绫奈"}</p>
                </div>
              </div>
          <div className="site-copy-note">
            <span>{dictionary.admin.siteBrandTip}</span>
            <p>{dictionary.admin.siteBrandNote}</p>
          </div>
          {brandMessage ? <p className="admin-message">{brandMessage}</p> : null}
        </div>
        <div className="admin-form-grid">
          <label>
            <span>{dictionary.admin.siteName}</span>
            <input value={brandDraft.siteName} onChange={(event) => onSiteBrandChange("siteName", event.target.value)} />
          </label>
          <label>
            <span>{dictionary.admin.logoText}</span>
            <input value={brandDraft.logoText} onChange={(event) => onSiteBrandChange("logoText", event.target.value)} />
          </label>
          <label>
            <span>{dictionary.admin.logoMark}</span>
            <input value={brandDraft.logoMark} onChange={(event) => onSiteBrandChange("logoMark", event.target.value)} />
          </label>
          <button type="button" onClick={() => void onSaveSiteSettings()} disabled={brandSaving}>
            {brandSaving ? dictionary.admin.saving : dictionary.common.save}
          </button>
        </div>
      </section>

      <div className="admin-workspace">
        <section className="admin-section admin-publish-panel">
          <div className="section-heading">
            <Upload size={20} />
            <div>
              <span className="eyebrow">{dictionary.admin.content}</span>
              <h2>{editingContent ? dictionary.admin.editContent : dictionary.admin.publishWorkspace}</h2>
              <p>{dictionary.admin.publishWorkspaceHint}</p>
            </div>
          </div>
          <div className="content-kind-tabs" role="tablist" aria-label={dictionary.admin.contentType}>
            <button
              type="button"
              role="tab"
              aria-selected={contentKind === "post"}
              className={contentKind === "post" ? "active" : ""}
              disabled={isUploading}
              onClick={() => onChangeContentKind("post")}
            >
              {dictionary.content.posts}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={contentKind === "album"}
              className={contentKind === "album" ? "active" : ""}
              disabled={isUploading}
              onClick={() => onChangeContentKind("album")}
            >
              {dictionary.content.albums}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={contentKind === "video"}
              className={contentKind === "video" ? "active" : ""}
              disabled={isUploading}
              onClick={() => onChangeContentKind("video")}
            >
              {dictionary.content.videos}
            </button>
          </div>
          <div className="admin-form-grid admin-editor-grid admin-workbench-grid">
            <label>
              <span>{dictionary.content.visibility}</span>
              <select
                aria-label={dictionary.content.visibility}
                value={contentVisibility}
                disabled={isUploading}
                onChange={(event) => setContentVisibility(event.target.value as MembershipLevel)}
              >
                <option value="public">{dictionary.membership.public}</option>
                <option value="normal">{dictionary.membership.normal}</option>
                <option value="gold">{dictionary.membership.gold}</option>
                <option value="diamond">{dictionary.membership.diamond}</option>
              </select>
            </label>
            <label>
              <span>{dictionary.admin.contentStatus}</span>
              <select
                aria-label={dictionary.admin.contentStatus}
                value={contentStatus}
                disabled={isUploading}
                onChange={(event) => setContentStatus(event.target.value as ContentRecordStatus)}
              >
                <option value="published">{dictionary.admin.publishedContent}</option>
                <option value="draft">{dictionary.admin.draftContent}</option>
                <option value="scheduled">{dictionary.admin.scheduledContent}</option>
              </select>
            </label>
            {contentStatus === "scheduled" ? (
              <label>
                <span>{dictionary.admin.scheduledAt}</span>
                <input
                  type="datetime-local"
                  value={contentScheduledAt}
                  onChange={(event) => setContentScheduledAt(event.target.value)}
                  disabled={isUploading}
                />
              </label>
            ) : null}
            <label className="full-row">
              <span>{dictionary.admin.titleLabel}</span>
              <input
                value={contentTitle}
                onChange={(event) => setContentTitle(event.target.value)}
                placeholder={titlePlaceholderFor(contentKind, dictionary)}
              />
            </label>
            <label>
              <span>{dictionary.admin.contentCategory}</span>
              <input
                value={contentCategory}
                onChange={(event) => setContentCategory(event.target.value)}
                placeholder={dictionary.admin.contentCategoryPlaceholder}
              />
            </label>
            <label>
              <span>{dictionary.admin.contentTags}</span>
              <input
                value={contentTags}
                onChange={(event) => setContentTags(event.target.value)}
                placeholder={dictionary.admin.contentTagsPlaceholder}
              />
              <small className="form-hint">{dictionary.admin.contentTagsHint}</small>
            </label>
            <label className="full-row">
              <span>{bodyLabelFor(contentKind, dictionary)}</span>
              <textarea
                value={contentBody}
                onChange={(event) => setContentBody(event.target.value)}
                placeholder={dictionary.content.bodyPlaceholder}
                rows={7}
              />
            </label>
            {contentKind === "post" ? (
              <label className="pin-toggle full-row">
                <input
                  checked={contentPinned}
                  disabled={isUploading}
                  type="checkbox"
                  onChange={(event) => setContentPinned(event.target.checked)}
                />
                <span className="pin-toggle-copy">
                  <strong>{dictionary.admin.pinPost}</strong>
                  <small>{dictionary.admin.pinPostHint}</small>
                </span>
              </label>
            ) : null}
            <div className="form-actions full-row">
              <button type="button" onClick={() => void onPublishContent(contentStatus)} disabled={isUploading}>
                {primaryContentActionLabel}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void onPublishContent(secondaryContentStatus)}
                disabled={isUploading}
              >
                {secondaryContentActionLabel}
              </button>
              {editingContent ? (
                <button type="button" className="secondary-button" onClick={resetContentForm}>
                  {dictionary.common.cancel}
                </button>
              ) : null}
            </div>
            <div className="content-workbench-note">
              <strong>{dictionary.admin.contentPreview}</strong>
              <span>{dictionary.admin.contentPreviewHint}</span>
            </div>
          </div>
          <div className="content-preview-panel content-preview-inline" aria-label={dictionary.admin.contentPreview}>
            <div className="content-preview-header">
              <div>
                <span className="eyebrow">{dictionary.admin.contentPreview}</span>
                <strong>{contentPreview.title}</strong>
              </div>
              <span className={`status-badge status-${contentStatus}`}>
                {contentStatusLabel(contentStatus, dictionary)}
              </span>
            </div>
            <div className="content-preview-cover">
              {contentPreview.coverImage ? (
                <img src={contentPreview.coverImage} alt={contentPreview.title} />
              ) : (
                <div className="content-preview-cover-empty">{dictionary.content.noCover}</div>
              )}
              <div className="content-preview-meta">
                <span>{contentKindLabel(contentKind, dictionary)}</span>
                <span>{formatCategoryLabel(contentPreview.category, locale)}</span>
              </div>
            </div>
            <p className="content-preview-body">{contentPreview.body}</p>
            <div className="content-preview-foot">
              <span className={`tier-badge tier-${contentPreview.visibility}`}>{dictionary.membership[contentPreview.visibility]}</span>
              {contentPreview.pinned ? <span className="pinned-badge"><Pin size={14} />{dictionary.admin.pinnedPost}</span> : null}
              {contentPreview.tags.length > 0 ? (
                <span className="content-preview-tags">{contentPreview.tags.map((tag) => `#${tag}`).join(" ")}</span>
              ) : null}
              <span className="content-preview-date">{contentPreview.date}</span>
            </div>
          </div>
          <p className="muted">{dictionary.admin.demoNotice}</p>
          {publishMessage ? (
            <p className="admin-message">
              {publishMessage}
              {publishMessage === dictionary.common.status ? (
                <>
                  {dictionary.common.colon}
                  {formatCount(posts.length, dictionary.content.postUnit)} /{" "}
                  {formatCount(albums.length, dictionary.content.albumUnit)} /{" "}
                  {formatCount(videoCollections.length, dictionary.content.videoCollectionUnit)}
                </>
              ) : null}
            </p>
          ) : null}
        </section>

        <aside className="admin-section admin-media-panel">
          <div className="section-heading">
            <FileUp size={20} />
            <div>
              <span className="eyebrow">{dictionary.admin.mediaWorkflow}</span>
              <h2>{dictionary.admin.mediaUpload}</h2>
              <p>{dictionary.admin.mediaWorkflowHint}</p>
            </div>
          </div>
          {contentKind === "video" ? (
            <div className="video-upload-stack">
              <label className="file-upload-label">
                <span>{dictionary.admin.mediaFile}</span>
                <span className="file-upload-control">
                  <Video size={17} />
                  <span>{uploadTarget === "video" ? dictionary.admin.uploading : dictionary.admin.uploadVideoFile}</span>
                  <input
                    aria-label={dictionary.admin.uploadVideoFile}
                    type="file"
                    accept="video/*"
                    disabled={isUploading}
                    onChange={(event) => {
                      void onUploadVideoFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </span>
                <small className="form-hint">{dictionary.admin.videoUploadHint}</small>
              </label>
              <label className="file-upload-label">
                <span>{dictionary.admin.coverFile}</span>
                <span className="file-upload-control">
                  <Image size={17} />
                  <span>{uploadTarget === "cover" ? dictionary.admin.uploading : dictionary.admin.uploadVideoCoverFile}</span>
                  <input
                    aria-label={dictionary.admin.uploadVideoCoverFile}
                    type="file"
                    accept="image/*"
                    disabled={isUploading}
                    onChange={(event) => {
                      void onUploadImageFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </span>
                <small className="form-hint">{dictionary.admin.imageUploadHint}</small>
              </label>
            </div>
          ) : (
            <label className="file-upload-label">
              <span>{dictionary.admin.mediaFile}</span>
              <span className="file-upload-control">
                <FileUp size={17} />
                <span>{uploadTarget === "image" ? dictionary.admin.uploading : dictionary.admin.uploadImageFile}</span>
                <input
                  aria-label={dictionary.admin.uploadImageFile}
                  type="file"
                  accept="image/*"
                  disabled={isUploading}
                  onChange={(event) => {
                    void onUploadImageFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </span>
              <small className="form-hint">{dictionary.admin.imageUploadHint}</small>
            </label>
          )}
          {uploadProgress ? (
            <div className="upload-progress-box" aria-live="polite">
              <div className="upload-progress-copy">
                <strong>{uploadTargetLabel(uploadTarget, dictionary)}</strong>
                <span>{uploadPhaseLabel(uploadProgress, dictionary)}</span>
                <b>{uploadProgress.percent}%</b>
              </div>
              <div
                aria-label={`${uploadPhaseLabel(uploadProgress, dictionary)} ${uploadProgress.percent}%`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={uploadProgress.percent}
                className="upload-progress-track"
                role="progressbar"
              >
                <span style={{ width: `${uploadProgress.percent}%` }} />
              </div>
            </div>
          ) : null}
          <div className="media-attachment-grid">
            <div className={`media-attachment-state${contentAsset ? " media-attachment-ready" : ""}`}>
              <strong>{contentAsset ? dictionary.admin.attachedReady : dictionary.admin.waitingForMedia}</strong>
              <span>{contentAsset ? dictionary.admin.mediaAttached : dictionary.admin.replaceMediaHint}</span>
            </div>
            {contentKind === "video" ? (
              <div className={`media-attachment-state${uploadedVideoCoverMeta ? " media-attachment-ready" : ""}`}>
                <strong>{uploadedVideoCoverMeta ? dictionary.admin.coverFile : dictionary.admin.waitingForMedia}</strong>
                <span>{uploadedVideoCoverMeta ? dictionary.admin.coverAttached : dictionary.admin.imageUploadHint}</span>
              </div>
            ) : null}
          </div>
          <div className="upload-rule-list" aria-label={dictionary.admin.uploadRules}>
            <div>
              <span>{dictionary.admin.imageUploadRule}</span>
              <strong>{formatCount(photos.length, dictionary.content.photoUnit)}</strong>
              <small>{dictionary.admin.imageUploadHint}</small>
            </div>
            <div>
              <span>{dictionary.admin.videoUploadRule}</span>
              <strong>{formatCount(videos.length, dictionary.content.videoUnit)}</strong>
              <small>{dictionary.admin.videoUploadHint}</small>
            </div>
          </div>
          <div className="media-library-panel">
            <div className="media-library-heading">
              <div>
                <strong>{dictionary.admin.mediaLibrary}</strong>
                <span>{dictionary.admin.mediaLibraryHint}</span>
              </div>
            </div>
            <div className="media-library-toolbar">
              <label>
                <span>{dictionary.admin.searchMedia}</span>
                <span className="member-search-control">
                  <Search size={16} />
                  <input
                    value={mediaQuery}
                    onChange={(event) => setMediaQuery(event.target.value)}
                    placeholder={dictionary.admin.mediaSearchPlaceholder}
                  />
                </span>
              </label>
              <label>
                <span>{dictionary.admin.mediaTypeFilter}</span>
                <select
                  value={mediaTypeFilter}
                  onChange={(event) => setMediaTypeFilter(event.target.value as JavaMediaType | "ALL")}
                >
                  <option value="ALL">{dictionary.admin.mediaTypeAll}</option>
                  <option value="IMAGE">{dictionary.admin.mediaTypeImage}</option>
                  <option value="VIDEO">{dictionary.admin.mediaTypeVideo}</option>
                </select>
              </label>
            </div>
            <div className="media-library-list" aria-live="polite">
              {mediaPage.items.map((asset) => (
                <div className="media-library-row" key={asset.id}>
                  <div>
                    <span className={`media-type-chip media-type-${asset.mediaType.toLowerCase()}`}>
                      {asset.mediaType === "IMAGE" ? dictionary.admin.mediaTypeImage : dictionary.admin.mediaTypeVideo}
                    </span>
                    <strong title={asset.originalName}>{asset.originalName}</strong>
                    <small>
                      {formatBytes(asset.sizeBytes)}
                      {dictionary.common.colon}
                      {asset.objectKey}
                    </small>
                  </div>
                  <div className="media-library-actions">
                    {asset.mediaType === "IMAGE" ? (
                      <>
                        <button type="button" onClick={() => onUseMedia(asset, "image")}>
                          {dictionary.admin.useAsImage}
                        </button>
                        {contentKind === "video" ? (
                          <button type="button" onClick={() => onUseMedia(asset, "cover")}>
                            {dictionary.admin.useAsCover}
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={contentKind !== "video"}
                        onClick={() => onUseMedia(asset, "video")}
                      >
                        {dictionary.admin.useAsVideo}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {mediaPage.items.length === 0 ? <p className="muted">{dictionary.admin.noMediaAssets}</p> : null}
            </div>
            <div className="member-pagination media-library-pagination">
              <span>{mediaLoading ? dictionary.admin.uploading : mediaSummary}</span>
              {mediaError ? <strong>{mediaError}</strong> : null}
              <div>
                <button
                  type="button"
                  onClick={() => void onLoadMediaPage(Math.max(mediaPage.page - 1, 0))}
                  disabled={mediaLoading || mediaPage.page <= 0}
                >
                  {dictionary.admin.memberPrevious}
                </button>
                <button
                  type="button"
                  onClick={() => void onLoadMediaPage(mediaPage.page + 1)}
                  disabled={mediaLoading || mediaCurrentPage >= mediaTotalPages}
                >
                  {dictionary.admin.memberNext}
                </button>
              </div>
            </div>
          </div>
          {uploadMessage ? <p className="admin-message">{uploadMessage}</p> : null}
        </aside>
      </div>

      <section className="admin-section admin-section-wide">
        <div className="section-heading">
          <Database size={20} />
          <div>
            <h2>{dictionary.admin.existingContent}</h2>
            <p>{dictionary.admin.contentLibraryHint}</p>
          </div>
        </div>
        <div className="content-library-summary">
          <span>{formatCount(posts.length, dictionary.content.postUnit)}</span>
          <span>{formatCount(albums.length, dictionary.content.albumUnit)}</span>
          <span>{formatCount(videoCollections.length, dictionary.content.videoCollectionUnit)}</span>
        </div>
        <div className="content-library-toolbar">
          <button
            type="button"
            className="select-visible-content"
            onClick={onToggleVisibleContentRows}
            disabled={filteredContentLibraryRows.length === 0}
            aria-pressed={allVisibleContentSelected}
          >
            {allVisibleContentSelected ? dictionary.admin.clearVisibleContent : dictionary.admin.selectVisibleContent}
          </button>
          <label>
            <span>{dictionary.admin.searchContent}</span>
            <span className="member-search-control">
              <Search size={16} />
              <input
                value={contentLibraryQuery}
                onChange={(event) => setContentLibraryQuery(event.target.value)}
                placeholder={dictionary.admin.contentSearchPlaceholder}
              />
            </span>
          </label>
          <label>
            <span>{dictionary.admin.contentKindFilter}</span>
            <select
              value={contentLibraryKindFilter}
              onChange={(event) => setContentLibraryKindFilter(event.target.value as ContentLibraryKindFilter)}
            >
              <option value="ALL">{dictionary.admin.contentKindAll}</option>
              <option value="post">{dictionary.content.posts}</option>
              <option value="album">{dictionary.content.albums}</option>
              <option value="video">{dictionary.content.videos}</option>
            </select>
          </label>
          <label>
            <span>{dictionary.admin.contentLevelFilter}</span>
            <select
              value={contentLibraryLevelFilter}
              onChange={(event) => setContentLibraryLevelFilter(event.target.value as ContentLibraryLevelFilter)}
            >
              <option value="ALL">{dictionary.admin.contentLevelAll}</option>
              <option value="public">{dictionary.membership.public}</option>
              <option value="normal">{dictionary.membership.normal}</option>
              <option value="gold">{dictionary.membership.gold}</option>
              <option value="diamond">{dictionary.membership.diamond}</option>
            </select>
          </label>
          <span className="content-library-filter-summary">{contentLibraryFilteredSummary}</span>
        </div>
        {selectedContentCount > 0 ? (
          <div className="content-bulk-toolbar" aria-live="polite">
            <span className="content-bulk-count">{contentSelectionSummary}</span>
            <label>
              <span>{dictionary.admin.bulkVisibility}</span>
              <select
                value={bulkContentVisibility}
                onChange={(event) => setBulkContentVisibility(event.target.value as MembershipLevel)}
              >
                <option value="public">{dictionary.membership.public}</option>
                <option value="normal">{dictionary.membership.normal}</option>
                <option value="gold">{dictionary.membership.gold}</option>
                <option value="diamond">{dictionary.membership.diamond}</option>
              </select>
            </label>
            <button type="button" onClick={() => void onBulkUpdateContentVisibility()}>
              {dictionary.admin.applyBulkVisibility}
            </button>
            <button type="button" className="danger-button" onClick={() => void onBulkDeleteContent()}>
              <Trash2 size={16} />
              <span>{dictionary.admin.bulkDeleteContent}</span>
            </button>
            <button type="button" className="ghost-button" onClick={() => setSelectedContentKeys([])}>
              {dictionary.admin.clearSelection}
            </button>
          </div>
        ) : null}
        {contentLibraryMessage ? <p className="admin-message">{contentLibraryMessage}</p> : null}
        <div className="admin-content-list">
          {filteredContentLibraryRows.map((row) => (
            <div
              key={`${row.kind}-${row.id}`}
              className={`admin-content-row${selectedContentKeys.includes(contentLibraryRowKey(row)) ? " admin-content-row-selected" : ""}`}
            >
              <label className="content-row-select">
                <input
                  type="checkbox"
                  checked={selectedContentKeys.includes(contentLibraryRowKey(row))}
                  onChange={() => onToggleContentRow(row)}
                  aria-label={`${dictionary.admin.selectContent}: ${row.title}`}
                />
              </label>
              <div className="admin-content-main">
                <span className="admin-content-meta">{contentKindLabel(row.kind, dictionary)}</span>
                <strong>{row.title}</strong>
                <div className="admin-row-meta">
                  {row.pinned ? (
                    <span className="pinned-badge">
                      <Pin size={14} />
                      {dictionary.admin.pinnedPost}
                    </span>
                  ) : null}
                  <span className={`status-badge status-${row.status}`}>
                    {contentStatusLabel(row.status, dictionary)}
                  </span>
                  <span className={`tier-badge tier-${row.level}`}>{dictionary.membership[row.level]}</span>
                  {row.category ? <span className="taxonomy-badge">{formatCategoryLabel(row.category, locale)}</span> : null}
                  {row.tags.map((tag) => (
                    <span key={tag} className="taxonomy-tag">
                      #{tag}
                    </span>
                  ))}
                  <span>{row.date || dictionary.admin.noDate}</span>
                </div>
              </div>
              <div className="row-actions">
                <button type="button" onClick={() => onEditContent({ id: row.id, kind: row.kind })}>
                  <Pencil size={16} />
                  <span>{dictionary.common.edit}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedContentKeys((current) =>
                      current.filter((key) => key !== contentLibraryRowKey(row))
                    );
                    void deleteContent({ id: row.id, kind: row.kind });
                  }}
                >
                  <Trash2 size={16} />
                  <span>{dictionary.common.delete}</span>
                </button>
              </div>
            </div>
          ))}
          {filteredContentLibraryRows.length === 0 ? (
            <p className="muted">{dictionary.admin.noContent}</p>
          ) : null}
        </div>
      </section>

      <section className="admin-section">
        <div className="section-heading">
          <KeyRound size={20} />
          <div>
            <h2>{dictionary.admin.invites}</h2>
            <p>{dictionary.admin.generateInvite}</p>
          </div>
        </div>
        <div className="form-actions">
          <select
            value={newInviteLevel}
            onChange={(event) => setNewInviteLevel(event.target.value as EditableLevel)}
            aria-label={dictionary.content.visibility}
          >
            <option value="normal">{dictionary.membership.normal}</option>
            <option value="gold">{dictionary.membership.gold}</option>
            <option value="diamond">{dictionary.membership.diamond}</option>
          </select>
          <button type="button" onClick={onGenerateInvite}>
            {dictionary.admin.generateInvite}
          </button>
        </div>
        <label className="invite-expiry-field">
          <span>{dictionary.admin.inviteExpiresAt}</span>
          <input
            type="datetime-local"
            value={newInviteExpiresAt}
            onChange={(event) => setNewInviteExpiresAt(event.target.value)}
            aria-label={dictionary.admin.inviteExpiresAt}
          />
          <small className="muted">{dictionary.admin.inviteExpiresAtHint}</small>
        </label>
        {generatedCode ? <p className="muted">{generatedCode}</p> : null}
        <div className="invite-list">
          {unusedInvites.map((invite) => (
            <div key={invite.id} className="invite-row">
              <code>{invite.code}</code>
              <span className={`tier-badge tier-${invite.targetLevel}`}>
                {dictionary.membership[invite.targetLevel]}
              </span>
              <span className="muted">
                {invite.expiresAt ? new Date(invite.expiresAt).toLocaleString() : dictionary.admin.inviteNoExpiry}
              </span>
              <button type="button" onClick={() => deleteInvite(invite.id)} aria-label={`${dictionary.admin.deleteInvite}${dictionary.common.colon}${invite.code}`}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {unusedInvites.length === 0 ? <p className="muted">{dictionary.admin.noInvites}</p> : null}
        </div>
      </section>

      <section className="admin-section">
        <div className="section-heading">
          <UsersRound size={20} />
          <div>
            <h2>{dictionary.admin.users}</h2>
            <p>{dictionary.admin.changeLevel}</p>
          </div>
        </div>
        <div className="member-toolbar">
          <label className="member-search">
            <span>{dictionary.admin.searchMembers}</span>
            <span className="member-search-control">
              <Search size={16} />
              <input
                value={memberQuery}
                onChange={(event) => setMemberQuery(event.target.value)}
                placeholder={dictionary.admin.memberSearchPlaceholder}
              />
            </span>
          </label>
          <label className="member-page-size">
            <span>{dictionary.admin.memberPageSize}</span>
            <select
              value={memberPageSize}
              onChange={(event) => setMemberPageSize(Number(event.target.value))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
        <div className="user-list">
          {memberRows.map((user) => (
            <div key={user.id} className="user-row">
              <div className="member-profile">
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
              <div className="member-badges">
                <span className={`tier-badge tier-${user.level}`}>{dictionary.membership[user.level]}</span>
                <span className={`member-status ${user.disabled ? "member-status-disabled" : "member-status-active"}`}>
                  {user.disabled ? dictionary.admin.memberStatusDisabled : dictionary.admin.memberStatusActive}
                </span>
                <span className="member-role">
                  {user.isAdmin ? dictionary.admin.memberRoleAdmin : dictionary.admin.memberRoleUser}
                </span>
              </div>
              <div className="member-actions">
                <select
                  value={user.level}
                  onChange={(event) => updateUserLevel(user.id, event.target.value as EditableLevel)}
                  aria-label={`${dictionary.admin.changeLevel}${dictionary.common.colon}${user.name}`}
                >
                  <option value="normal">{dictionary.membership.normal}</option>
                  <option value="gold">{dictionary.membership.gold}</option>
                  <option value="diamond">{dictionary.membership.diamond}</option>
                </select>
                <button type="button" onClick={() => toggleUserDisabled(user.id)}>
                  {user.disabled ? dictionary.content.enable : dictionary.content.disable}
                </button>
              </div>
            </div>
          ))}
          {memberRows.length === 0 ? <p className="muted">{dictionary.admin.noMembers}</p> : null}
        </div>
        <div className="member-pagination" aria-live="polite">
          <span>{memberLoading ? dictionary.admin.uploading : memberSummary}</span>
          {memberError ? <strong>{memberError}</strong> : null}
          <div>
            <button
              type="button"
              onClick={() => void onLoadMemberPage(Math.max(adminUserPage.page - 1, 0))}
              disabled={memberLoading || adminUserPage.page <= 0}
            >
              {dictionary.admin.memberPrevious}
            </button>
            <button
              type="button"
              onClick={() => void onLoadMemberPage(adminUserPage.page + 1)}
              disabled={memberLoading || memberCurrentPage >= memberTotalPages}
            >
              {dictionary.admin.memberNext}
            </button>
          </div>
        </div>
      </section>

      <section className="admin-section admin-section-wide audit-section">
        <div className="section-heading">
          <History size={20} />
          <div>
            <h2>{dictionary.admin.auditLogs}</h2>
            <p>{dictionary.admin.auditLogsHint}</p>
          </div>
        </div>
        <div className="audit-list" aria-live="polite">
          {auditPage.items.map((log) => (
            <div className="audit-row" key={log.id}>
              <div className="audit-action">
                <span>{log.actionType}</span>
                <strong>{formatAuditDate(log.createdAt)}</strong>
              </div>
              <div className="audit-main">
                <div className="audit-meta-grid">
                  <span>
                    {dictionary.admin.auditActor}
                    {dictionary.common.colon}
                    <b>{log.adminDisplayName || log.adminUsername}</b>
                  </span>
                  <span>
                    {dictionary.admin.auditTarget}
                    {dictionary.common.colon}
                    <b>{log.targetType}</b>
                  </span>
                </div>
                <p>
                  {dictionary.admin.auditDetail}
                  {dictionary.common.colon}
                  {formatAuditDetail(log.detailJson)}
                </p>
              </div>
              <code title={log.targetId ?? log.id}>{log.targetId ?? log.id}</code>
            </div>
          ))}
          {auditPage.items.length === 0 ? <p className="muted">{dictionary.admin.noAuditLogs}</p> : null}
        </div>
        <div className="member-pagination" aria-live="polite">
          <span>{auditLoading ? dictionary.admin.uploading : auditSummary}</span>
          {auditError ? <strong>{auditError}</strong> : null}
          <div>
            <button
              type="button"
              onClick={() => void onLoadAuditPage(Math.max(auditPage.page - 1, 0))}
              disabled={auditLoading || auditPage.page <= 0}
            >
              {dictionary.admin.memberPrevious}
            </button>
            <button
              type="button"
              onClick={() => void onLoadAuditPage(auditPage.page + 1)}
              disabled={auditLoading || auditCurrentPage >= auditTotalPages}
            >
              {dictionary.admin.memberNext}
            </button>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <div className="section-heading">
          <Database size={20} />
          <div>
            <h2>{dictionary.admin.imageStorage}</h2>
            <p>{dictionary.admin.uploadImages}</p>
          </div>
        </div>
        <div className="integration-box">
          <Cloud size={22} />
          <span>
            {formatCount(albums.length, dictionary.content.albumUnit)} /{" "}
            {formatCount(photos.length, dictionary.content.photoUnit)}
          </span>
        </div>
      </section>

      <section className="admin-section">
        <div className="section-heading">
          <Video size={20} />
          <div>
            <h2>{dictionary.admin.videoStorage}</h2>
            <p>{dictionary.admin.uploadVideos}</p>
          </div>
        </div>
        <div className="integration-box">
          <Cloud size={22} />
          <span>
            {formatCount(videoCollections.length, dictionary.content.videoCollectionUnit)} /{" "}
            {formatCount(videos.length, dictionary.content.videoUnit)}
          </span>
        </div>
      </section>
    </div>
  );
}


