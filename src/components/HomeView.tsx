"use client";

import { ContentCard } from "@/components/ContentCard";
import { getHomeFeed } from "@/data/repository";
import type { getDictionary } from "@/i18n/dictionaries";
import { useAppState } from "@/state/AppStateProvider";

type Dictionary = ReturnType<typeof getDictionary>;

function formatFeedKind(kind: "post" | "album" | "videoCollection", dictionary: Dictionary) {
  if (kind === "post") return dictionary.content.post;
  if (kind === "album") return dictionary.content.album;
  return dictionary.content.videoCollection;
}

function formatArchiveTitleLines(title: string) {
  if (title === "绫奈动态、相册和视频，按会员等级开放。") {
    return ["绫奈动态", "相册和视频", "按会员等级开放"];
  }

  return [title];
}

export function HomeView({ dictionary }: { dictionary: Dictionary }) {
  const { viewer, currentUser, posts, albums, photos, videoCollections, videos } = useAppState();
  const feed = getHomeFeed(viewer, { posts, albums, photos, videoCollections, videos });
  const featured = feed[0];
  const secondary = feed.slice(1, 3);
  const titleLines = formatArchiveTitleLines(dictionary.home.title);

  return (
    <div className="page home-page">
      <section className="hero archive-hero">
        <div className="hero-copy">
          <span className="archive-kicker">{dictionary.home.archiveKicker}</span>
          <span className="eyebrow">{dictionary.home.eyebrow}</span>
          <h1 className="archive-title" aria-label={dictionary.home.title}>
            {titleLines.map((line) => (
              <span key={line} className="archive-title-line">
                {line}
              </span>
            ))}
          </h1>
          <p>{dictionary.home.subtitle}</p>
          <div className="split-summary">
            <div className="summary-chip">
              <strong>{dictionary.home.viewerStatus}</strong>
              <span className="muted">
                {currentUser
                  ? `${dictionary.auth.currentUser}${dictionary.common.colon}${currentUser.name}`
                  : dictionary.membership.visitor}
              </span>
            </div>
            <div className="summary-chip">
              <strong>{dictionary.home.inviteOnlyLabel}</strong>
              <span className="muted">{dictionary.home.inviteOnly}</span>
            </div>
            <div className="summary-chip">
              <strong>{dictionary.home.languageLabel}</strong>
              <span className="muted">{dictionary.home.bilingual}</span>
            </div>
          </div>
        </div>

        <div className="hero-preview-panel">
          <div className="access-ladder" aria-label={dictionary.home.accessLadderAria}>
            <span>{dictionary.home.accessLadder}</span>
            <div className="ladder-steps">
              <span>{dictionary.membership.normal}</span>
              <span>{dictionary.membership.gold}</span>
              <span>{dictionary.membership.diamond}</span>
            </div>
          </div>

          {featured ? (
            <div
              className="featured-preview"
              aria-label={dictionary.home.featuredPreviewAria}
              style={{ backgroundImage: `url(${featured.coverImage})` }}
            >
              <div className="featured-preview-overlay">
                <span>{formatFeedKind(featured.kind, dictionary)}</span>
                <strong>{featured.title}</strong>
              </div>
            </div>
          ) : (
            <div className="featured-preview featured-preview-empty" aria-label={dictionary.home.featuredPreviewAria}>
              <strong>{dictionary.home.latest}</strong>
            </div>
          )}

          <div className="preview-strip" aria-hidden="true">
            {secondary.map((item) => (
              <span
                key={item.id}
                className="preview-thumb"
                style={{ backgroundImage: `url(${item.coverImage})` }}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{dictionary.home.recentlyCleared}</span>
            <h2>{dictionary.home.latest}</h2>
          </div>
        </div>
        <div className="feed-grid">
          {feed.map((item) => (
            <ContentCard
              key={item.id}
              title={item.title}
              excerpt={item.excerpt}
              coverImage={item.coverImage}
              requiredLevel={item.requiredLevel}
              dictionary={dictionary}
              meta={formatFeedKind(item.kind, dictionary)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
