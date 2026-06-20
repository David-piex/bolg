"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, CalendarDays, Images, MessageSquareText, PlayCircle } from "lucide-react";
import { MembershipBadge } from "@/components/MembershipBadge";
import { getAlbums, getPosts, getVideoCollections } from "@/data/repository";
import type { MembershipLevel } from "@/domain/membership";
import type { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/routing";
import { useAppState } from "@/state/AppStateProvider";

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

function NotFoundState({
  dictionary,
  kind,
  locale
}: {
  dictionary: Dictionary;
  kind: DetailKind;
  locale: Locale;
}) {
  return (
    <DetailShell dictionary={dictionary} kind={kind} locale={locale}>
      <section className="detail-empty">
        <span className="eyebrow">{kindLabel(dictionary, kind)}</span>
        <h1>{dictionary.content.detailNotFoundTitle}</h1>
        <p>{dictionary.content.detailNotFoundHint}</p>
      </section>
    </DetailShell>
  );
}

function DetailHero({
  coverImage,
  dictionary,
  excerpt,
  icon,
  kind,
  publishedAt,
  title,
  visibility
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
        {hasCover ? <img src={coverImage} alt={`${title}${dictionary.common.chinese === "中文版" ? "封面" : " cover"}`} /> : null}
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

export function ContentDetailView({
  dictionary,
  id,
  kind,
  locale
}: {
  dictionary: Dictionary;
  id: string;
  kind: DetailKind;
  locale: Locale;
}) {
  const { viewer, posts, albums, photos, videoCollections, videos } = useAppState();

  if (kind === "post") {
    const post = getPosts(viewer, { posts }).find((candidate) => candidate.id === id);
    if (!post) return <NotFoundState dictionary={dictionary} kind={kind} locale={locale} />;

    return (
      <DetailShell dictionary={dictionary} kind={kind} locale={locale}>
        <DetailHero
          coverImage={post.coverImage}
          dictionary={dictionary}
          excerpt={post.excerpt}
          icon={<MessageSquareText size={36} />}
          kind={dictionary.content.post}
          publishedAt={post.publishedAt}
          title={post.title}
          visibility={post.visibility}
        />
        <section className="detail-body">
          <p>{post.body}</p>
        </section>
      </DetailShell>
    );
  }

  if (kind === "album") {
    const album = getAlbums(viewer, { albums, photos }).find((candidate) => candidate.id === id);
    if (!album) return <NotFoundState dictionary={dictionary} kind={kind} locale={locale} />;

    return (
      <DetailShell dictionary={dictionary} kind={kind} locale={locale}>
        <DetailHero
          coverImage={album.coverImage}
          dictionary={dictionary}
          excerpt={album.description}
          icon={<Images size={38} />}
          kind={dictionary.content.album}
          publishedAt={album.publishedAt}
          title={album.title}
          visibility={album.defaultVisibility}
        />
        <section className="detail-media-grid">
          {album.photos.map((photo) => (
            <figure key={photo.id}>
              <img src={photo.imageUrl} alt={photo.title} loading="lazy" decoding="async" />
              <figcaption>
                <span>{photo.title}</span>
                <MembershipBadge level={photo.requiredLevel} dictionary={dictionary} />
              </figcaption>
            </figure>
          ))}
        </section>
      </DetailShell>
    );
  }

  const collection = getVideoCollections(viewer, { videoCollections, videos }).find((candidate) => candidate.id === id);
  if (!collection) return <NotFoundState dictionary={dictionary} kind={kind} locale={locale} />;

  return (
    <DetailShell dictionary={dictionary} kind={kind} locale={locale}>
      <DetailHero
        coverImage={collection.coverImage}
        dictionary={dictionary}
        excerpt={collection.description}
        icon={<PlayCircle size={40} />}
        kind={dictionary.content.videoCollection}
        publishedAt={collection.publishedAt}
        title={collection.title}
        visibility={collection.defaultVisibility}
      />
      <section className="detail-video-list">
        {collection.videos.map((video) => (
          <article key={video.id}>
            <video controls preload="metadata" poster={video.thumbnailUrl || collection.coverImage} src={video.playbackUrl} />
            <div>
              <h2>{video.title}</h2>
              <p>{video.description}</p>
              <MembershipBadge level={video.requiredLevel} dictionary={dictionary} />
            </div>
          </article>
        ))}
      </section>
    </DetailShell>
  );
}
