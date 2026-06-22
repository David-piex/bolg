"use client";

import { useEffect, useState } from "react";
import { ContentCard } from "@/components/ContentCard";
import { ContentDiscoveryToolbar, type ContentSort } from "@/components/ContentDiscoveryToolbar";
import { EmptyContentState } from "@/components/EmptyContentState";
import { getPosts } from "@/data/repository";
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

function formatVisibilityLevels(dictionary: Dictionary) {
  return [
    dictionary.membership.public,
    dictionary.membership.normal,
    dictionary.membership.gold,
    dictionary.membership.diamond
  ].join(" / ");
}

function pageSummary(template: string, input: { page: number; total: number; totalPages: number }) {
  return template
    .replace("{page}", String(input.page))
    .replace("{totalPages}", String(input.totalPages))
    .replace("{total}", String(input.total));
}

export function PostsView({ dictionary, locale }: { dictionary: Dictionary; locale: Locale }) {
  const { viewer } = useAppAuthState();
  const { loadPostsPage, posts: statePosts } = useAppContentState();
  const visiblePosts = getPosts(viewer, { posts: statePosts });
  const [page, setPage] = useState(0);
  const [pagedPosts, setPagedPosts] = useState(visiblePosts.slice(0, pageSize));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState<ContentSort>("latest");
  const [total, setTotal] = useState(visiblePosts.length);
  const [totalPages, setTotalPages] = useState(Math.max(1, Math.ceil(visiblePosts.length / pageSize)));
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

  const categoryOptions = uniqueSorted(visiblePosts.map((post) => post.category));
  const tagOptions = uniqueSorted(visiblePosts.flatMap((post) => post.tags));

  useEffect(() => {
    const canReuseInitialPage = page === 0 && !query && !category && !tag && sort === "latest" && visiblePosts.length > 0;
    if (canReuseInitialPage) {
      setPagedPosts(visiblePosts.slice(0, pageSize));
      setTotal(visiblePosts.length);
      setTotalPages(Math.max(1, Math.ceil(visiblePosts.length / pageSize)));
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void loadPostsPage({ category, page, q: query, size: pageSize, sort, tag })
      .then((result) => {
        if (cancelled) return;
        setPagedPosts(getPosts(viewer, { posts: result.items }));
        setTotal(result.total);
        setTotalPages(Math.max(1, result.totalPages));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category, loadPostsPage, page, query, sort, tag, visiblePosts, viewer]);

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">{dictionary.content.posts}</span>
        <h1>{dictionary.nav.posts}</h1>
        <p>
          {dictionary.content.visibility}
          {dictionary.common.colon}
          {formatVisibilityLevels(dictionary)}
        </p>
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
      <div className="feed-grid">
        {pagedPosts.map((post) => (
          <ContentCard
            key={post.id}
            title={post.title}
            excerpt={post.excerpt}
            coverImage={post.coverImage}
            requiredLevel={post.visibility}
            dictionary={dictionary}
            href={`/${locale}/posts/${post.id}`}
            meta={post.publishedAt}
          />
        ))}
      </div>
      {pagedPosts.length === 0 ? <EmptyContentState dictionary={dictionary} label={dictionary.content.posts} /> : null}
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
