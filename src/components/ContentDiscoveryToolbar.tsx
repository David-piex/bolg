"use client";

import type { getDictionary } from "@/i18n/dictionaries";

type Dictionary = ReturnType<typeof getDictionary>;

export type ContentSort = "latest" | "oldest" | "title";

type ContentDiscoveryToolbarProps = {
  category: string;
  categoryOptions: string[];
  dictionary: Dictionary;
  query: string;
  setCategory: (value: string) => void;
  setQuery: (value: string) => void;
  setSort: (value: ContentSort) => void;
  setTag: (value: string) => void;
  sort: ContentSort;
  tag: string;
  tagOptions: string[];
};

export function ContentDiscoveryToolbar({
  category,
  categoryOptions,
  dictionary,
  query,
  setCategory,
  setQuery,
  setSort,
  setTag,
  sort,
  tag,
  tagOptions
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
      <label className="content-filter-control">
        <span>{dictionary.content.categoryLabel}</span>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">{dictionary.content.categoryAll}</option>
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label className="content-filter-control">
        <span>{dictionary.content.tagLabel}</span>
        <select value={tag} onChange={(event) => setTag(event.target.value)}>
          <option value="">{dictionary.content.tagAll}</option>
          {tagOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
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
