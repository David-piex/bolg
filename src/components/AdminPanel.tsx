"use client";

import { useState } from "react";
import {
  Cloud,
  Database,
  FileUp,
  KeyRound,
  Pencil,
  ShieldCheck,
  Trash2,
  Upload,
  UsersRound,
  Video
} from "lucide-react";
import { canManage, type MembershipLevel } from "@/domain/membership";
import type { getDictionary } from "@/i18n/dictionaries";
import { uploadImageFile, uploadVideoFile, type UploadedImage, type UploadedVideo } from "@/services/admin-upload-client";
import { useAppState } from "@/state/AppStateProvider";

type Dictionary = ReturnType<typeof getDictionary>;
type EditableLevel = Exclude<MembershipLevel, "public">;
type ContentKind = "post" | "album" | "video";
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

export function AdminPanel({ dictionary }: { dictionary: Dictionary }) {
  const {
    users,
    invites,
    posts,
    albums,
    photos,
    videoCollections,
    videos,
    currentUser,
    authSession,
    authReady,
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
  const [uploadedImageMeta, setUploadedImageMeta] = useState<UploadedImage | null>(null);
  const [uploadedVideoMeta, setUploadedVideoMeta] = useState<UploadedVideo | null>(null);
  const [editingContent, setEditingContent] = useState<EditingContent>(null);
  const unusedInvites = invites.filter((invite) => !invite.usedByUserId);

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

  function onChangeContentKind(kind: ContentKind) {
    setContentKind(kind);
    setUploadMessage(null);
    setUploadedImageMeta(null);
    setUploadedVideoMeta(null);
    setEditingContent(null);
  }

  async function onUploadImageFile(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!authSession?.accessToken) {
      setUploadMessage(dictionary.admin.uploadNeedsLogin);
      return;
    }

    setUploadMessage(dictionary.admin.uploading);

    try {
      const uploaded = await uploadImageFile({
        accessToken: authSession.accessToken,
        file,
        visibility: contentVisibility
      });
      setContentAsset(uploaded.publicUrl);
      setUploadedImageMeta(uploaded);
      setUploadMessage(dictionary.admin.imageUploadedReady);
    } catch (error) {
      setUploadMessage(uploadErrorMessage(error, dictionary.admin.uploadFailed));
    }
  }

  async function onUploadVideoFile(file: File | undefined) {
    if (!file) {
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

    setUploadMessage(dictionary.admin.uploading);

    try {
      const uploaded = await uploadVideoFile({
        accessToken: authSession.accessToken,
        collectionId: `draft-video-${Date.now()}`,
        file,
        visibility: contentVisibility
      });
      setContentAsset(uploaded.playbackUrl);
      setUploadedVideoMeta(uploaded);
      setUploadMessage(dictionary.admin.videoUploadedReady);
    } catch (error) {
      setUploadMessage(uploadErrorMessage(error, dictionary.admin.uploadFailed));
    }
  }

  function resetContentForm() {
    setContentTitle("");
    setContentBody("");
    setContentAsset("");
    setUploadedImageMeta(null);
    setUploadedVideoMeta(null);
    setUploadMessage(null);
    setEditingContent(null);
  }

  function onEditContent(nextEditing: Exclude<EditingContent, null>) {
    setEditingContent(nextEditing);
    setContentKind(nextEditing.kind);
    setPublishMessage(null);
    setUploadMessage(null);
    setUploadedImageMeta(null);
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
          coverImage: contentAsset
        });
      } else if (editingContent?.kind === "video") {
        await updateVideoCollection({
          id: editingContent.id,
          title: contentTitle,
          description: contentBody,
          defaultVisibility: contentVisibility,
          coverImage: contentAsset
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
          thumbnailUrl: uploadedVideoMeta?.thumbnailUrl
        });
      }

      setPublishMessage(dictionary.common.status);
      resetContentForm();
    } catch (error) {
      setPublishMessage(uploadErrorMessage(error, dictionary.admin.publishFailed));
    }
  }

  return (
    <div className="admin-grid">
      <section className="admin-section admin-section-wide">
        <div className="section-heading">
          <ShieldCheck size={20} />
          <div>
            <h2>{dictionary.admin.signedInAs}</h2>
            <p>
              {currentUser?.name}
              {dictionary.common.colon}
              {currentUser?.email}
            </p>
          </div>
        </div>
      </section>

      <section className="admin-section admin-section-wide">
        <div className="section-heading">
          <Upload size={20} />
          <div>
            <h2>{editingContent ? dictionary.admin.editContent : dictionary.admin.content}</h2>
            <p>{dictionary.admin.subtitle}</p>
          </div>
        </div>
        <div className="admin-form-grid">
          <label>
            <span>{dictionary.admin.contentType}</span>
            <select value={contentKind} onChange={(event) => onChangeContentKind(event.target.value as typeof contentKind)}>
              <option value="post">{dictionary.content.posts}</option>
              <option value="album">{dictionary.content.albums}</option>
              <option value="video">{dictionary.content.videos}</option>
            </select>
          </label>
          <label>
            <span>{dictionary.admin.titleLabel}</span>
            <input
              value={contentTitle}
              onChange={(event) => setContentTitle(event.target.value)}
              placeholder={titlePlaceholderFor(contentKind, dictionary)}
            />
          </label>
          <label>
            <span>{dictionary.content.visibility}</span>
            <select
              value={contentVisibility}
              onChange={(event) => setContentVisibility(event.target.value as MembershipLevel)}
            >
              <option value="public">{dictionary.membership.public}</option>
              <option value="normal">{dictionary.membership.normal}</option>
              <option value="gold">{dictionary.membership.gold}</option>
              <option value="diamond">{dictionary.membership.diamond}</option>
            </select>
          </label>
          {contentKind === "video" ? (
            <label className="file-upload-label">
              <span>{dictionary.admin.mediaFile}</span>
              <span className="file-upload-control">
                <FileUp size={17} />
                <span>{dictionary.admin.uploadVideoFile}</span>
                <input
                  aria-label={dictionary.admin.uploadVideoFile}
                  type="file"
                  accept="video/*"
                  onChange={(event) => {
                    void onUploadVideoFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </span>
            </label>
          ) : (
            <label className="file-upload-label">
              <span>{dictionary.admin.mediaFile}</span>
              <span className="file-upload-control">
                <FileUp size={17} />
                <span>{dictionary.admin.uploadImageFile}</span>
                <input
                  aria-label={dictionary.admin.uploadImageFile}
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    void onUploadImageFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </span>
            </label>
          )}
          <div className="media-attachment-state">
            <span>{contentAsset ? dictionary.admin.mediaAttached : dictionary.admin.replaceMediaHint}</span>
          </div>
          <label className="full-row">
            <span>{bodyLabelFor(contentKind, dictionary)}</span>
            <textarea
              value={contentBody}
              onChange={(event) => setContentBody(event.target.value)}
              placeholder={dictionary.content.bodyPlaceholder}
              rows={4}
            />
          </label>
          <div className="form-actions full-row">
            <button type="button" onClick={() => void onPublishContent()}>
              {editingContent ? dictionary.common.save : dictionary.common.publish}
            </button>
            {editingContent ? (
              <button type="button" onClick={resetContentForm}>
                {dictionary.common.cancel}
              </button>
            ) : null}
          </div>
        </div>
        <p className="muted">{dictionary.admin.demoNotice}</p>
        {uploadMessage ? <p className="muted">{uploadMessage}</p> : null}
        {publishMessage ? (
          <p className="muted">
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

      <section className="admin-section admin-section-wide">
        <div className="section-heading">
          <Database size={20} />
          <div>
            <h2>{dictionary.admin.existingContent}</h2>
            <p>
              {formatCount(posts.length, dictionary.content.postUnit)} /{" "}
              {formatCount(albums.length, dictionary.content.albumUnit)} /{" "}
              {formatCount(videoCollections.length, dictionary.content.videoCollectionUnit)}
            </p>
          </div>
        </div>
        <div className="admin-content-list">
          {posts.map((post) => (
            <div key={post.id} className="admin-content-row">
              <div>
                <strong>{post.title}</strong>
                <span className={`tier-badge tier-${post.visibility}`}>{dictionary.membership[post.visibility]}</span>
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
                <strong>{album.title}</strong>
                <span className={`tier-badge tier-${album.defaultVisibility}`}>
                  {dictionary.membership[album.defaultVisibility]}
                </span>
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
                <strong>{collection.title}</strong>
                <span className={`tier-badge tier-${collection.defaultVisibility}`}>
                  {dictionary.membership[collection.defaultVisibility]}
                </span>
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
        <div className="user-list">
          {users.map((user) => (
            <div key={user.id} className="user-row">
              <span>{user.name}</span>
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
          ))}
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
