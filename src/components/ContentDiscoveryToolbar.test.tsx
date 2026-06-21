import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContentDiscoveryToolbar } from "@/components/ContentDiscoveryToolbar";
import { getDictionary } from "@/i18n/dictionaries";

describe("ContentDiscoveryToolbar", () => {
  it("renders searchable and sortable content controls", () => {
    const dictionary = getDictionary("zh");
    const setCategory = vi.fn();
    const setQuery = vi.fn();
    const setSort = vi.fn();
    const setTag = vi.fn();

    render(
      <ContentDiscoveryToolbar
        category=""
        categoryOptions={["studio"]}
        dictionary={dictionary}
        query=""
        setCategory={setCategory}
        setQuery={setQuery}
        setSort={setSort}
        setTag={setTag}
        sort="latest"
        tag=""
        tagOptions={["preview"]}
      />
    );

    fireEvent.change(screen.getByLabelText(dictionary.content.searchLabel), { target: { value: "summer" } });
    fireEvent.change(screen.getByLabelText(dictionary.content.categoryLabel), { target: { value: "studio" } });
    fireEvent.change(screen.getByLabelText(dictionary.content.tagLabel), { target: { value: "preview" } });
    fireEvent.change(screen.getByLabelText(dictionary.content.sortLabel), { target: { value: "title" } });

    expect(setQuery).toHaveBeenCalledWith("summer");
    expect(setCategory).toHaveBeenCalledWith("studio");
    expect(setTag).toHaveBeenCalledWith("preview");
    expect(setSort).toHaveBeenCalledWith("title");
  });
});
