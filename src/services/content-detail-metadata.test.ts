import { describe, expect, it } from "vitest";
import { buildContentDetailMetadata } from "@/services/content-detail-metadata";
import type { RemoteDetail } from "@/services/content-client";

describe("buildContentDetailMetadata", () => {
  it("builds seo metadata for a post detail", () => {
    const detail: RemoteDetail = {
      kind: "post",
      post: {
        body: "Body",
        category: "studio",
        coverImage: "https://images.example/post.jpg",
        excerpt: "Post excerpt",
        id: "post-1",
        pinned: false,
        publishedAt: "2026-06-20",
        scheduledAt: "",
        status: "published",
        tags: [],
        title: "Post title",
        type: "post",
        visibility: "public"
      }
    };

    const metadata = buildContentDetailMetadata({ detail, id: "post-1", kind: "post", locale: "zh" });

    expect(metadata.title).toBe("Post title | \u7EFB\u5948");
    expect(metadata.description).toBe("Post excerpt");
    expect(metadata.alternates).toEqual({ canonical: "/zh/posts/post-1" });
  });

  it("marks missing details as noindex", () => {
    const metadata = buildContentDetailMetadata({ detail: null, id: "missing", kind: "video", locale: "zh" });

    expect(metadata.title).toBe("\u89C6\u9891\u672A\u627E\u5230 | \u7EFB\u5948");
    expect(metadata.robots).toEqual({ follow: false, index: false });
  });
});
