"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, CalendarDays, Images, MessageSquareText, PlayCircle } from "lucide-react";
import { MembershipBadge } from "@/components/MembershipBadge";
import { getAlbums, getPosts, getVideoCollections } from "@/data/repository";
import type { MembershipLevel } from "@/domain/membership";
import type { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/routing";
import {
  fetchRemoteAlbumDetail,
  fetchRemotePostDetail,
  fetchRemoteVideoDetail,
  type RemoteDetail
} from "@/services/content-client";
import { useAppAuthState, useAppContentState } from "@/state/AppStateProvider";

type Dictionary = ReturnType<typeof getDictionary>;
type DetailKind = "post" | "album" | "video";

function listPath(locale: Locale, kind: DetailKind) {
  if (kind === "post") return `/${locale}/posts`;
  if (kind === "album") return `/${locale}/albums`;
  return `/${locale}/videos`;
}

function kindLabel(dictionary: Dictionary, kind: DetailKind) {
  if (kind === "post") return dictionary.content.post;
  if (kind === "album") return dictionary.content.album;
  return dictionary.content.videoCollection;
}

function DetailShell({
  children,
  dictionary,
  kind,
  locale
}: {
  children: ReactNode;
  dictionary: Dictionary;
  kind: DetailKind;
  locale: Locale;
}) {
  return (
    <div className="page detail-page">
      <Link className="back-link" href={listPath(locale, kind)}>
        <ArrowLeft size={17} aria-hidden="true" />
        <span>{dictionary.content.backToList}</span>
      </Link>
      {children}
    </div>
  );
}

function EmptyDetailState({
  dictionary,
  kind,
  locale,
  loading
}: {
  dictionary: Dictionary;
  kind: DetailKind;
  locale: Locale;
  loading: boolean;
}) {
  return (
    <DetailShell dictionary={dictionary} kind={kind} locale={locale}>
      <section className={`detail-empty${loading ? " detail-loading" : ""}`} aria-live="polite">
        <span className="eyebrow">{kindLabel(dictionary, kind)}</span>
        <h1>{loading ? dictionary.content.detailLoadingTitle : dictionary.content.detailNotFoundTitle}</h1>
        <p>{loading ? dictionary.content.detailLoadingHint : dictionary.content.detailNotFoundHint}</p>
      </section>
    </DetailShell>
  );
}

function DetailHero({
  coverImage,
  excerpt,
  icon,
  kind,
  publishedAt,
  title,
  visibility,
  dictionary
}: {
  coverImage: string;
  dictionary: Dictionary;
  excerpt: string;
  icon: ReactNode;
  kind: string;
  publishedAt: string;
  title: string;
  visibility: MembershipLevel;
}) {
  const hasCover = Boolean(coverImage.trim());

  return (
    <section className="detail-hero">
      <div className={`detail-cover${hasCover ? "" : " detail-cover-empty"}`}>
        {hasCover ? <img src={coverImage} alt={title} /> : null}
        <span className="detail-cover-icon" aria-hidden="true">
          {icon}
        </span>
      </div>
      <div className="detail-copy">
        <span className="eyebrow">{kind}</span>
        <h1>{title}</h1>
        <p>{excerpt}</p>
        <div className="detail-meta">
          <MembershipBadge level={visibility} dictionary={dictionary} />
          <span>
            <CalendarDays size={16} aria-hidden="true" />
            {publishedAt}
          </span>
        </div>
      </div>
    </section>
  );
}

function resolvedLevel(item: { visibilityOverride: MembershipLevel | null }, fallback: MembershipLevel) {
  return item.visibilityOverride ?? fallback;
}

export function ContentDetailView({
  dictionary,
  id,
  initialDetail,
  kind,
  locale
}: {
  dictionary: Dictionary;
  id: string;
  initialDetail?: RemoteDetail | null;
  kind: DetailKind;
  locale: Locale;
}) {
  const { viewer } = useAppAuthState();
  const { posts, albums, photos, videoCollections, videos } = useAppContentState();

  const localDetail = useMemo<RemoteDetail | null>(() => {
    if (kind === "post") {
      const post = getPosts(viewer, { posts }).find((candidate) => candidate.id === id);
      return post ? { kind: "post", post } : null;
    }

    if (kind === "album") {
      const album = getAlbums(viewer, { albums, photos }).find((candidate) => candidate.id === id);
      return album ? { album, kind: "album", photos: album.photos } : null;
    }

    const collection = getVideoCollections(viewer, { videoCollections, videos }).find((candidate) => candidate.id === id);
    return collection ? { collection, kind: "video", videos: collection.videos } : null;
  }, [albums, id, kind, photos, posts, videoCollections, videos, viewer]);

  const [remoteDetail, setRemoteDetail] = useState<RemoteDetail | null>(initialDetail ?? null);
  const [remoteDetailLoading, setRemoteDetailLoading] = useState(() => !initialDetail && !localDetail);

  useEffect(() => {
    if (initialDetail) {
      setRemoteDetail(initialDetail);
      setRemoteDetailLoading(false);
      return;
    }

    if (localDetail) {
      setRemoteDetail(null);
      setRemoteDetailLoading(false);
      return;
    }

    let cancelled = false;
    setRemoteDetail(null);
    setRemoteDetailLoading(true);

    const request =
      kind === "post"
        ? fetchRemotePostDetail(id)
        : kind === "album"
          ? fetchRemoteAlbumDetail(id)
          : fetchRemoteVideoDetail(id);

    void request
      .then((detail) => {
        if (!cancelled) {
          setRemoteDetail(detail);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRemoteDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRemoteDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, initialDetail, kind, localDetail]);

  const detail = initialDetail?.kind === kind ? initialDetail : localDetail ?? remoteDetail;

  if (!detail) {
    return <EmptyDetailState dictionary={dictionary} kind={kind} locale={locale} loading={remoteDetailLoading} />;
  }

  if (detail.kind === "post") {
    return (
      <DetailShell dictionary={dictionary} kind={kind} locale={locale}>
        <DetailHero
          coverImage={detail.post.coverImage}
          dictionary={dictionary}
          excerpt={detail.post.excerpt}
          icon={<MessageSquareText size={36} />}
          kind={dictionary.content.post}
          publishedAt={detail.post.publishedAt}
          title={detail.post.title}
          visibility={detail.post.visibility}
        />
        <section className="detail-body">
          <p>{detail.post.body}</p>
        </section>
      </DetailShell>
    );
  }

  if (detail.kind === "album") {
    return (
      <DetailShell dictionary={dictionary} kind={kind} locale={locale}>
        <DetailHero
          coverImage={detail.album.coverImage}
          dictionary={dictionary}
          excerpt={detail.album.description}
          icon={<Images size={38} />}
          kind={dictionary.content.album}
          publishedAt={detail.album.publishedAt}
          title={detail.album.title}
          visibility={detail.album.defaultVisibility}
        />
        <section className="detail-media-grid">
          {detail.photos.map((photo) => (
            <figure key={photo.id}>
              <img src={photo.imageUrl} alt={photo.title} loading="lazy" decoding="async" />
              <figcaption>
                <span>{photo.title}</span>
                <MembershipBadge level={resolvedLevel(photo, detail.album.defaultVisibility)} dictionary={dictionary} />
              </figcaption>
            </figure>
          ))}
        </section>
      </DetailShell>
    );
  }

  return (
    <DetailShell dictionary={dictionary} kind={kind} locale={locale}>
      <DetailHero
        coverImage={detail.collection.coverImage}
        dictionary={dictionary}
        excerpt={detail.collection.description}
        icon={<PlayCircle size={40} />}
        kind={dictionary.content.videoCollection}
        publishedAt={detail.collection.publishedAt}
        title={detail.collection.title}
        visibility={detail.collection.defaultVisibility}
      />
      <section className="detail-video-list">
        {detail.videos.map((video) => (
          <article key={video.id}>
            <video
              controls
              preload="metadata"
              poster={video.thumbnailUrl || detail.collection.coverImage}
              src={video.playbackUrl}
            />
            <div>
              <h2>{video.title}</h2>
              <p>{video.description}</p>
              <MembershipBadge level={resolvedLevel(video, detail.collection.defaultVisibility)} dictionary={dictionary} />
            </div>
          </article>
        ))}
      </section>
    </DetailShell>
  );
}
