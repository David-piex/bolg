"use client";

import { useEffect, useState } from "react";
import { ContentCard } from "@/components/ContentCard";
import { EmptyContentState } from "@/components/EmptyContentState";
import { getVideoCollections } from "@/data/repository";
import type { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/routing";
import { useAppState } from "@/state/AppStateProvider";

type Dictionary = ReturnType<typeof getDictionary>;
const pageSize = 12;

function formatCount(count: number, unit: string) {
  if (/[\u4e00-\u9fff]/.test(unit)) {
    return `${count}${unit}`;
  }

  return `${count} ${unit}`;
}

function pageSummary(template: string, input: { page: number; total: number; totalPages: number }) {
  return template
    .replace("{page}", String(input.page))
    .replace("{totalPages}", String(input.totalPages))
    .replace("{total}", String(input.total));
}

export function VideosView({ dictionary, locale }: { dictionary: Dictionary; locale: Locale }) {
  const { loadVideosPage, viewer, videoCollections, videos } = useAppState();
  const visibleCollections = getVideoCollections(viewer, { videoCollections, videos });
  const [page, setPage] = useState(0);
  const [pagedCollections, setPagedCollections] = useState(visibleCollections.slice(0, pageSize));
  const [total, setTotal] = useState(visibleCollections.length);
  const [totalPages, setTotalPages] = useState(Math.max(1, Math.ceil(visibleCollections.length / pageSize)));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void loadVideosPage({ page, size: pageSize })
      .then((result) => {
        if (cancelled) return;
        setPagedCollections(
          getVideoCollections(viewer, {
            videoCollections: result.items.map((item) => item.collection),
            videos: result.items.map((item) => item.video)
          })
        );
        setTotal(result.total);
        setTotalPages(Math.max(1, result.totalPages));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadVideosPage, page, viewer]);

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">{dictionary.content.videos}</span>
        <h1>{dictionary.nav.videos}</h1>
        <p>{dictionary.content.videosDescription}</p>
      </section>
      <div className="media-grid">
        {pagedCollections.map((collection) => (
          <ContentCard
            key={collection.id}
            title={collection.title}
            excerpt={collection.description}
            coverImage={collection.coverImage}
            requiredLevel={collection.defaultVisibility}
            dictionary={dictionary}
            href={`/${locale}/videos/${collection.id}`}
            meta={formatCount(collection.videos.length, dictionary.content.videoUnit)}
            video
          />
        ))}
      </div>
      {pagedCollections.length === 0 ? <EmptyContentState dictionary={dictionary} label={dictionary.content.videos} /> : null}
      <div className="content-pagination" aria-live="polite">
        <span>
          {loading
            ? dictionary.admin.uploading
            : pageSummary(dictionary.content.pageSummary, { page: page + 1, total, totalPages })}
        </span>
        <div>
          <button type="button" onClick={() => setPage((current) => Math.max(current - 1, 0))} disabled={loading || page <= 0}>
            {dictionary.content.previousPage}
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={loading || page + 1 >= totalPages}
          >
            {dictionary.content.nextPage}
          </button>
        </div>
      </div>
    </div>
  );
}
