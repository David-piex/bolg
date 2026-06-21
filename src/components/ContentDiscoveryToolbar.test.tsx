import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContentDiscoveryToolbar } from "@/components/ContentDiscoveryToolbar";
import { getDictionary } from "@/i18n/dictionaries";

describe("ContentDiscoveryToolbar", () => {
  it("renders searchable and sortable content controls", () => {
    const dictionary = getDictionary("zh");
    const setQuery = vi.fn();
    const setSort = vi.fn();

    render(
      <ContentDiscoveryToolbar
        dictionary={dictionary}
        query=""
        setQuery={setQuery}
        setSort={setSort}
        sort="latest"
      />
    );

    fireEvent.change(screen.getByLabelText(dictionary.content.searchLabel), { target: { value: "summer" } });
    fireEvent.change(screen.getByLabelText(dictionary.content.sortLabel), { target: { value: "title" } });

    expect(setQuery).toHaveBeenCalledWith("summer");
    expect(setSort).toHaveBeenCalledWith("title");
  });
});
