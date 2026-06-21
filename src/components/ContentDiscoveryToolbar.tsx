"use client";

import type { getDictionary } from "@/i18n/dictionaries";

type Dictionary = ReturnType<typeof getDictionary>;

export type ContentSort = "latest" | "oldest" | "title";

type ContentDiscoveryToolbarProps = {
  dictionary: Dictionary;
  query: string;
  setQuery: (value: string) => void;
  setSort: (value: ContentSort) => void;
  sort: ContentSort;
};

export function ContentDiscoveryToolbar({
  dictionary,
  query,
  setQuery,
  setSort,
  sort
}: ContentDiscoveryToolbarProps) {
  return (
    <div className="content-discovery-toolbar">
      <label className="content-search-control">
        <span>{dictionary.content.searchLabel}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={dictionary.content.searchPlaceholder}
        />
      </label>
      <label className="content-sort-control">
        <span>{dictionary.content.sortLabel}</span>
        <select value={sort} onChange={(event) => setSort(event.target.value as ContentSort)}>
          <option value="latest">{dictionary.content.sortLatest}</option>
          <option value="oldest">{dictionary.content.sortOldest}</option>
          <option value="title">{dictionary.content.sortTitle}</option>
        </select>
      </label>
    </div>
  );
}
