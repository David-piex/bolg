import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContentDetailView } from "@/components/ContentDetailView";
import { getDictionary } from "@/i18n/dictionaries";
import { AppStateProvider } from "@/state/AppStateProvider";

describe("ContentDetailView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders a post detail page for visible local content", () => {
    stubUnavailableApi();
    const dictionary = getDictionary("zh");

    render(
      <AppStateProvider>
        <ContentDetailView dictionary={dictionary} id="post-public" kind="post" locale="zh" />
      </AppStateProvider>
    );

    expect(screen.getByRole("link", { name: dictionary.content.backToList })).toHaveAttribute("href", "/zh/posts");
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText(dictionary.content.detailNotFoundTitle)).not.toBeInTheDocument();
  });

  it("loads a remote detail item when it is not in the local state", async () => {
    const dictionary = getDictionary("zh");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const path = String(input);

        if (path === "/api/content/posts/remote-post") {
          return jsonResponse({
            content: "Remote detail body",
            id: "remote-post",
            mediaAssetIds: ["remote-media"],
            publishedAt: "2026-06-20T00:00:00Z",
            title: "Remote detail title",
            visibility: "PUBLIC"
          });
        }

        return jsonResponse({ albums: [], posts: [], videos: [] }, path === "/api/content" ? 200 : 401);
      }) as unknown as typeof fetch
    );

    render(
      <AppStateProvider>
        <ContentDetailView dictionary={dictionary} id="remote-post" kind="post" locale="zh" />
      </AppStateProvider>
    );

    expect(screen.getByText(dictionary.content.detailLoadingTitle)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: "Remote detail title" })).toBeInTheDocument();
    expect(screen.getAllByText("Remote detail body").length).toBeGreaterThan(0);
  });

  it("shows a clear locked or missing state for unavailable content", async () => {
    stubUnavailableApi();
    const dictionary = getDictionary("zh");

    render(
      <AppStateProvider>
        <ContentDetailView dictionary={dictionary} id="missing-content" kind="video" locale="zh" />
      </AppStateProvider>
    );

    await waitFor(() => expect(screen.getByText(dictionary.content.detailNotFoundTitle)).toBeInTheDocument());
    expect(screen.getByText(dictionary.content.detailNotFoundHint)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: dictionary.content.backToList })).toHaveAttribute("href", "/zh/videos");
  });
});

function stubUnavailableApi() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) =>
      jsonResponse({ errorCode: "NOT_FOUND", message: "Not found" }, String(input) === "/api/content" ? 500 : 404)
    ) as unknown as typeof fetch
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status
  });
}
