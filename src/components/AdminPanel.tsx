"use client";

import { useState } from "react";
import { Cloud, Database, FileUp, KeyRound, UsersRound, Upload, Video } from "lucide-react";
import { canManage, type MembershipLevel } from "@/domain/membership";
import type { getDictionary } from "@/i18n/dictionaries";
import { uploadImageFile, uploadVideoFile, type UploadedVideo } from "@/services/admin-upload-client";
import { useAppState } from "@/state/AppStateProvider";

type Dictionary = ReturnType<typeof getDictionary>;
type EditableLevel = Exclude<MembershipLevel, "public">;

function formatCount(count: number, unit: string) {
  return `${count} ${unit}`;
}

export function AdminPanel({ dictionary }: { dictionary: Dictionary }) {
  const {
    users,
    invites,
    posts,
    albums,
    videoCollections,
    currentUser,
    authSession,
    updateUserLevel,
    toggleUserDisabled,
    generateInvite,
    publishPost,
    createAlbumWithPhoto,
    createVideoCollectionWithVideo
  } = useAppState();
  const [newInviteLevel, setNewInviteLevel] = useState<EditableLevel>("normal");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [contentKind, setContentKind] = useState<"post" | "album" | "video">("post");
  const [contentTitle, setContentTitle] = useState("");
  const [contentBody, setContentBody] = useState("");
  const [contentVisibility, setContentVisibility] = useState<MembershipLevel>("gold");
  const [contentAsset, setContentAsset] = useState("");
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadedVideoMeta, setUploadedVideoMeta] = useState<UploadedVideo | null>(null);
  const unusedInvites = invites.filter((invite) => !invite.usedByUserId);

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

  function onGenerateInvite() {
    setGeneratedCode(generateInvite(newInviteLevel));
  }

  function onChangeContentKind(kind: "post" | "album" | "video") {
    setContentKind(kind);
    setUploadMessage(null);
    setUploadedVideoMeta(null);
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
      setUploadMessage(dictionary.admin.uploadReady);
    } catch {
      setUploadMessage(dictionary.admin.uploadFailed);
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
      setUploadMessage(dictionary.admin.uploadReady);
    } catch {
      setUploadMessage(dictionary.admin.uploadFailed);
    }
  }

  function onPublishContent() {
    if (contentKind === "post") {
      publishPost({
        title: contentTitle,
        body: contentBody,
        visibility: contentVisibility,
        coverImage: contentAsset
      });
    }

    if (contentKind === "album") {
      createAlbumWithPhoto({
        title: contentTitle,
        description: contentBody,
        visibility: contentVisibility,
        photoTitle: contentTitle,
        imageUrl: contentAsset
      });
    }

    if (contentKind === "video") {
      createVideoCollectionWithVideo({
        title: contentTitle,
        description: contentBody,
        visibility: contentVisibility,
        videoTitle: contentTitle,
        playbackUrl: contentAsset,
        cloudinaryPublicId: uploadedVideoMeta?.cloudinaryPublicId,
        thumbnailUrl: uploadedVideoMeta?.thumbnailUrl
      });
    }

    setPublishMessage(dictionary.common.status);
    setContentTitle("");
    setContentBody("");
    setContentAsset("");
    setUploadedVideoMeta(null);
    setUploadMessage(null);
  }

  return (
    <div className="admin-grid">
      <section className="admin-section admin-section-wide">
        <div className="section-heading">
          <Upload size={20} />
          <div>
            <h2>{dictionary.admin.content}</h2>
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
            <span>{dictionary.content.posts}</span>
            <input
              value={contentTitle}
              onChange={(event) => setContentTitle(event.target.value)}
              placeholder={dictionary.content.titlePlaceholder}
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
          <label>
            <span>{contentKind === "video" ? dictionary.content.videoUrl : dictionary.content.imageUrl}</span>
            <input value={contentAsset} onChange={(event) => setContentAsset(event.target.value)} placeholder="https://" />
          </label>
          {contentKind === "video" ? (
            <label className="file-upload-label">
              <span>{dictionary.admin.localFile}</span>
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
              <span>{dictionary.admin.localFile}</span>
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
          <label className="full-row">
            <span>{dictionary.common.publish}</span>
            <textarea
              value={contentBody}
              onChange={(event) => setContentBody(event.target.value)}
              placeholder={dictionary.content.bodyPlaceholder}
              rows={4}
            />
          </label>
          <div className="form-actions full-row">
            <button type="button" onClick={onPublishContent}>{dictionary.common.publish}</button>
          </div>
        </div>
        <p className="muted">{dictionary.admin.demoNotice}</p>
        {uploadMessage ? <p className="muted">{uploadMessage}</p> : null}
        {publishMessage ? (
          <p className="muted">
            {formatCount(posts.length, dictionary.content.postUnit)} /{" "}
            {formatCount(albums.length, dictionary.content.albumUnit)} /{" "}
            {formatCount(videoCollections.length, dictionary.content.videoCollectionUnit)}
          </p>
        ) : null}
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
            </div>
          ))}
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
            {formatCount(posts.length, dictionary.content.postUnit)}
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
          <span>{formatCount(videoCollections.length, dictionary.content.videoCollectionUnit)}</span>
        </div>
      </section>
    </div>
  );
}
