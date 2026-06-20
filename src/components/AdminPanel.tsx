"use client";

import { useEffect, useState } from "react";
import {
  Cloud,
  Database,
  FileUp,
  KeyRound,
  Pencil,
  ShieldCheck,
  Trash2,
  Upload,
  Search,
  UsersRound,
  Image,
  Video
} from "lucide-react";
import { canManage, type MembershipLevel } from "@/domain/membership";
import type { getDictionary } from "@/i18n/dictionaries";
import {
  uploadImageFile,
  uploadVideoFile,
  type UploadedImage,
  type UploadedVideo,
  type UploadProgress
} from "@/services/admin-upload-client";
import { listMedia, type JavaMediaAsset, type JavaMediaType } from "@/services/java-api-client";
import { useAppState } from "@/state/AppStateProvider";

type Dictionary = ReturnType<typeof getDictionary>;
type EditableLevel = Exclude<MembershipLevel, "public">;
type ContentKind = "post" | "album" | "video";
type UploadTarget = "image" | "video" | "cover";
type MediaUseTarget = "image" | "video" | "cover";
type EditingContent = {
  id: string;
  kind: ContentKind;
} | null;

function formatCount(count: number, unit: string) {
  return `${count} ${unit}`;
}

function uploadErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return `${fallback}${dictionarySeparator(fallback)}${error.message}`;
  }

  return fallback;
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

function memberPageSummary(template: string, input: { page: number; total: number; totalPages: number }) {
  return template
    .replace("{page}", String(input.page))
    .replace("{totalPages}", String(input.totalPages))
    .replace("{total}", String(input.total));
}

function mediaPageSummary(template: string, input: { page: number; total: number; totalPages: number }) {
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

export function AdminPanel({ dictionary }: { dictionary: Dictionary }) {
  const {
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
  } = useAppState();
  const [newInviteLevel, setNewInviteLevel] = useState<EditableLevel>("normal");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [contentKind, setContentKind] = useState<ContentKind>("post");
  const [contentTitle, setContentTitle] = useState("");
  const [contentBody, setContentBody] = useState("");
  const [contentVisibility, setContentVisibility] = useState<MembershipLevel>("gold");
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
  const unusedInvites = invites.filter((invite) => !invite.usedByUserId);
  const contentTotal = posts.length + albums.length + videoCollections.length;
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
  const latestContentDate = latestPublishedAt(
    [...posts, ...albums, ...videoCollections],
    dictionary.admin.noDate
  );
  const isUploading = uploadTarget !== null;

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
            setMemberError(error instanceof Error ? error.message : dictionary.admin.noMembers);
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
            setMediaError(error instanceof Error ? error.message : dictionary.admin.noMediaAssets);
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

  if (!authReady) {
    return (
      <section className="locked-state">
        <div>
          <h2>正在恢复管理员登录状态</h2>
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
    setGeneratedCode(await generateInvite(newInviteLevel));
  }

  async function onLoadMemberPage(page: number) {
    setMemberLoading(true);
    setMemberError(null);

    try {
      await loadAdminUsersPage({ page, q: memberQuery, size: memberPageSize });
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : dictionary.admin.noMembers);
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
      setMediaError(error instanceof Error ? error.message : dictionary.admin.noMediaAssets);
    } finally {
      setMediaLoading(false);
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
    setContentAsset("");
    setUploadedImageMeta(null);
    setUploadedVideoCoverMeta(null);
    setUploadedVideoMeta(null);
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
        setContentVisibility(post.visibility);
        setContentAsset(post.coverImage);
      }
      return;
    }

    if (nextEditing.kind === "album") {
      const album = albums.find((candidate) => candidate.id === nextEditing.id);

      if (album) {
        setContentTitle(album.title);
        setContentBody(album.description);
        setContentVisibility(album.defaultVisibility);
        setContentAsset(album.coverImage);
      }
      return;
    }

    const collection = videoCollections.find((candidate) => candidate.id === nextEditing.id);

    if (collection) {
      setContentTitle(collection.title);
      setContentBody(collection.description);
      setContentVisibility(collection.defaultVisibility);
      setContentAsset(collection.coverImage);
    }
  }

  async function onPublishContent() {
    if (isUploading) {
      setPublishMessage(dictionary.admin.uploadBlocksPublish);
      return;
    }

    setPublishMessage(null);

    try {
      if (editingContent?.kind === "post") {
        await updatePost({
          id: editingContent.id,
          title: contentTitle,
          body: contentBody,
          visibility: contentVisibility,
          coverImage: contentAsset,
          mediaAssetId: uploadedImageMeta?.mediaAssetId
        });
      } else if (editingContent?.kind === "album") {
        await updateAlbum({
          id: editingContent.id,
          title: contentTitle,
          description: contentBody,
          defaultVisibility: contentVisibility,
          coverImage: contentAsset,
          coverMediaId: uploadedImageMeta?.mediaAssetId
        });
      } else if (editingContent?.kind === "video") {
        await updateVideoCollection({
          id: editingContent.id,
          title: contentTitle,
          description: contentBody,
          defaultVisibility: contentVisibility,
          coverImage: uploadedVideoCoverMeta?.publicUrl || contentAsset,
          coverMediaId: uploadedVideoCoverMeta?.mediaAssetId
        });
      } else if (contentKind === "post") {
        await publishPost({
          title: contentTitle,
          body: contentBody,
          visibility: contentVisibility,
          coverImage: contentAsset,
          mediaAssetId: uploadedImageMeta?.mediaAssetId
        });
      } else if (contentKind === "album") {
        await createAlbumWithPhoto({
          title: contentTitle,
          description: contentBody,
          visibility: contentVisibility,
          photoTitle: contentTitle,
          imageUrl: contentAsset,
          mediaAssetId: uploadedImageMeta?.mediaAssetId
        });
      } else if (contentKind === "video") {
        await createVideoCollectionWithVideo({
          title: contentTitle,
          description: contentBody,
          visibility: contentVisibility,
          videoTitle: contentTitle,
          playbackUrl: contentAsset,
          mediaAssetId: uploadedVideoMeta?.mediaAssetId,
          coverMediaId: uploadedVideoCoverMeta?.mediaAssetId,
          thumbnailUrl: uploadedVideoCoverMeta?.publicUrl || uploadedVideoMeta?.thumbnailUrl
        });
      }

      setPublishMessage(dictionary.common.status);
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
          <div className="content-kind-tabs" aria-hidden="true">
            <button
              type="button"
              className={contentKind === "post" ? "active" : ""}
              disabled={isUploading}
              onClick={() => onChangeContentKind("post")}
            >
              {dictionary.content.posts}
            </button>
            <button
              type="button"
              className={contentKind === "album" ? "active" : ""}
              disabled={isUploading}
              onClick={() => onChangeContentKind("album")}
            >
              {dictionary.content.albums}
            </button>
            <button
              type="button"
              className={contentKind === "video" ? "active" : ""}
              disabled={isUploading}
              onClick={() => onChangeContentKind("video")}
            >
              {dictionary.content.videos}
            </button>
          </div>
          <div className="admin-form-grid admin-editor-grid">
            <label>
              <span>{dictionary.admin.contentType}</span>
              <select
                aria-label={dictionary.admin.contentType}
                value={contentKind}
                disabled={isUploading}
                onChange={(event) => onChangeContentKind(event.target.value as typeof contentKind)}
              >
                <option value="post">{dictionary.content.posts}</option>
                <option value="album">{dictionary.content.albums}</option>
                <option value="video">{dictionary.content.videos}</option>
              </select>
            </label>
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
            <label className="full-row">
              <span>{dictionary.admin.titleLabel}</span>
              <input
                value={contentTitle}
                onChange={(event) => setContentTitle(event.target.value)}
                placeholder={titlePlaceholderFor(contentKind, dictionary)}
              />
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
            <div className="form-actions full-row">
              <button type="button" onClick={() => void onPublishContent()} disabled={isUploading}>
                {editingContent ? dictionary.common.save : dictionary.common.publish}
              </button>
              {editingContent ? (
                <button type="button" className="secondary-button" onClick={resetContentForm}>
                  {dictionary.common.cancel}
                </button>
              ) : null}
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
                        ) : contentKind === "album" ? (
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
        <div className="admin-content-list">
          {posts.map((post) => (
            <div key={post.id} className="admin-content-row">
              <div>
                <span className="admin-content-meta">{dictionary.content.post}</span>
                <strong>{post.title}</strong>
                <div className="admin-row-meta">
                  <span className={`tier-badge tier-${post.visibility}`}>{dictionary.membership[post.visibility]}</span>
                  <span>{post.publishedAt}</span>
                </div>
              </div>
              <div className="row-actions">
                <button type="button" onClick={() => onEditContent({ id: post.id, kind: "post" })}>
                  <Pencil size={16} />
                  <span>{dictionary.common.edit}</span>
                </button>
                <button type="button" onClick={() => deleteContent({ id: post.id, kind: "post" })}>
                  <Trash2 size={16} />
                  <span>{dictionary.common.delete}</span>
                </button>
              </div>
            </div>
          ))}
          {albums.map((album) => (
            <div key={album.id} className="admin-content-row">
              <div>
                <span className="admin-content-meta">{dictionary.content.album}</span>
                <strong>{album.title}</strong>
                <div className="admin-row-meta">
                  <span className={`tier-badge tier-${album.defaultVisibility}`}>
                    {dictionary.membership[album.defaultVisibility]}
                  </span>
                  <span>{album.publishedAt}</span>
                </div>
              </div>
              <div className="row-actions">
                <button type="button" onClick={() => onEditContent({ id: album.id, kind: "album" })}>
                  <Pencil size={16} />
                  <span>{dictionary.common.edit}</span>
                </button>
                <button type="button" onClick={() => deleteContent({ id: album.id, kind: "album" })}>
                  <Trash2 size={16} />
                  <span>{dictionary.common.delete}</span>
                </button>
              </div>
            </div>
          ))}
          {videoCollections.map((collection) => (
            <div key={collection.id} className="admin-content-row">
              <div>
                <span className="admin-content-meta">{dictionary.content.videoCollection}</span>
                <strong>{collection.title}</strong>
                <div className="admin-row-meta">
                  <span className={`tier-badge tier-${collection.defaultVisibility}`}>
                    {dictionary.membership[collection.defaultVisibility]}
                  </span>
                  <span>{collection.publishedAt}</span>
                </div>
              </div>
              <div className="row-actions">
                <button type="button" onClick={() => onEditContent({ id: collection.id, kind: "video" })}>
                  <Pencil size={16} />
                  <span>{dictionary.common.edit}</span>
                </button>
                <button type="button" onClick={() => deleteContent({ id: collection.id, kind: "video" })}>
                  <Trash2 size={16} />
                  <span>{dictionary.common.delete}</span>
                </button>
              </div>
            </div>
          ))}
          {posts.length + albums.length + videoCollections.length === 0 ? (
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
        {generatedCode ? <p className="muted">{generatedCode}</p> : null}
        <div className="invite-list">
          {unusedInvites.map((invite) => (
            <div key={invite.id} className="invite-row">
              <code>{invite.code}</code>
              <span className={`tier-badge tier-${invite.targetLevel}`}>
                {dictionary.membership[invite.targetLevel]}
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
