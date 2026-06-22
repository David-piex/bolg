"use client";

import { useEffect, useMemo, useState } from "react";
import { ContentCard } from "@/components/ContentCard";
import { ContentDiscoveryToolbar, type ContentSort } from "@/components/ContentDiscoveryToolbar";
import { EmptyContentState } from "@/components/EmptyContentState";
import { getVideoCollections } from "@/data/repository";
import type { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/routing";
import { useAppAuthState, useAppContentState } from "@/state/AppStateProvider";

type Dictionary = ReturnType<typeof getDictionary>;
const pageSize = 12;

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right)
  );
}

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
  const { viewer } = useAppAuthState();
  const { loadVideosPage, videoCollections, videos } = useAppContentState();
  const visibleCollections = useMemo(
    () => getVideoCollections(viewer, { videoCollections, videos }),
    [videoCollections, videos, viewer]
  );
  const [page, setPage] = useState(0);
  const [pagedCollections, setPagedCollections] = useState(visibleCollections.slice(0, pageSize));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState<ContentSort>("latest");
  const [total, setTotal] = useState(visibleCollections.length);
  const [totalPages, setTotalPages] = useState(Math.max(1, Math.ceil(visibleCollections.length / pageSize)));
  const [loading, setLoading] = useState(false);

  function updateQuery(value: string) {
    setQuery(value);
    setPage(0);
  }

  function updateSort(value: ContentSort) {
    setSort(value);
    setPage(0);
  }

  function updateCategory(value: string) {
    setCategory(value);
    setPage(0);
  }

  function updateTag(value: string) {
    setTag(value);
    setPage(0);
  }

  const categoryOptions = useMemo(
    () => uniqueSorted(visibleCollections.map((collection) => collection.category)),
    [visibleCollections]
  );
  const tagOptions = useMemo(
    () => uniqueSorted(visibleCollections.flatMap((collection) => collection.tags)),
    [visibleCollections]
  );

  useEffect(() => {
    const canReuseInitialPage =
      page === 0 && !query && !category && !tag && sort === "latest" && visibleCollections.length > 0;
    if (canReuseInitialPage) {
      setPagedCollections(visibleCollections.slice(0, pageSize));
      setTotal(visibleCollections.length);
      setTotalPages(Math.max(1, Math.ceil(visibleCollections.length / pageSize)));
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void loadVideosPage({ category, page, q: query, size: pageSize, sort, tag })
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
  }, [category, loadVideosPage, page, query, sort, tag, videoCollections, videos, visibleCollections, viewer]);

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">{dictionary.content.videos}</span>
        <h1>{dictionary.nav.videos}</h1>
        <p>{dictionary.content.videosDescription}</p>
      </section>
      <ContentDiscoveryToolbar
        category={category}
        categoryOptions={categoryOptions}
        dictionary={dictionary}
        locale={locale}
        query={query}
        setCategory={updateCategory}
        setQuery={updateQuery}
        setSort={updateSort}
        setTag={updateTag}
        sort={sort}
        tag={tag}
        tagOptions={tagOptions}
      />
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
