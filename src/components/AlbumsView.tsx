"use client";

import { useEffect, useState } from "react";
import { ContentCard } from "@/components/ContentCard";
import { ContentDiscoveryToolbar, type ContentSort } from "@/components/ContentDiscoveryToolbar";
import { EmptyContentState } from "@/components/EmptyContentState";
import { getAlbums } from "@/data/repository";
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

export function AlbumsView({ dictionary, locale }: { dictionary: Dictionary; locale: Locale }) {
  const { loadAlbumsPage, viewer, albums: stateAlbums, photos } = useAppState();
  const visibleAlbums = getAlbums(viewer, { albums: stateAlbums, photos });
  const [page, setPage] = useState(0);
  const [pagedAlbums, setPagedAlbums] = useState(visibleAlbums.slice(0, pageSize));
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ContentSort>("latest");
  const [total, setTotal] = useState(visibleAlbums.length);
  const [totalPages, setTotalPages] = useState(Math.max(1, Math.ceil(visibleAlbums.length / pageSize)));
  const [loading, setLoading] = useState(false);

  function updateQuery(value: string) {
    setQuery(value);
    setPage(0);
  }

  function updateSort(value: ContentSort) {
    setSort(value);
    setPage(0);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void loadAlbumsPage({ page, q: query, size: pageSize, sort })
      .then((result) => {
        if (cancelled) return;
        setPagedAlbums(getAlbums(viewer, { albums: result.items, photos }));
        setTotal(result.total);
        setTotalPages(Math.max(1, result.totalPages));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadAlbumsPage, page, photos, query, sort, viewer]);

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">{dictionary.content.albums}</span>
        <h1>{dictionary.nav.albums}</h1>
        <p>{dictionary.content.albumsDescription}</p>
      </section>
      <ContentDiscoveryToolbar
        dictionary={dictionary}
        query={query}
        setQuery={updateQuery}
        setSort={updateSort}
        sort={sort}
      />
      <div className="media-grid">
        {pagedAlbums.map((album) => (
          <ContentCard
            key={album.id}
            title={album.title}
            excerpt={album.description}
            coverImage={album.coverImage}
            requiredLevel={album.defaultVisibility}
            dictionary={dictionary}
            href={`/${locale}/albums/${album.id}`}
            meta={formatCount(album.photos.length, dictionary.content.photoUnit)}
          />
        ))}
      </div>
      {pagedAlbums.length === 0 ? <EmptyContentState dictionary={dictionary} label={dictionary.content.albums} /> : null}
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
