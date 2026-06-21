import type { Metadata } from "next";
import type { RemoteDetail } from "@/services/content-client";

const siteName = "\u7EFB\u5948";

type DetailKind = "post" | "album" | "video";

type DetailMetadataInput = {
  detail: RemoteDetail | null;
  id: string;
  kind: DetailKind;
  locale: string;
};

export function buildContentDetailMetadata({ detail, id, kind, locale }: DetailMetadataInput): Metadata {
  if (!detail) {
    return {
      alternates: {
        canonical: `/${locale}/${kind}s/${id}`
      },
      description: missingDescription(kind),
      robots: {
        follow: false,
        index: false
      },
      title: `${missingTitle(kind)} | ${siteName}`
    };
  }

  if (detail.kind === "post") {
    return contentMetadata({
      canonicalPath: `/${locale}/posts/${id}`,
      description: detail.post.excerpt || detail.post.body,
      image: detail.post.coverImage,
      title: detail.post.title
    });
  }

  if (detail.kind === "album") {
    return contentMetadata({
      canonicalPath: `/${locale}/albums/${id}`,
      description: detail.album.description,
      image: detail.album.coverImage,
      title: detail.album.title
    });
  }

  return contentMetadata({
    canonicalPath: `/${locale}/videos/${id}`,
    description: detail.collection.description,
    image: detail.collection.coverImage,
    title: detail.collection.title
  });
}

function contentMetadata({
  canonicalPath,
  description,
  image,
  title
}: {
  canonicalPath: string;
  description: string;
  image: string;
  title: string;
}): Metadata {
  const cleanDescription = summarize(description);
  const cleanImage = image.trim();
  const metaTitle = `${title} | ${siteName}`;
  const metadata: Metadata = {
    alternates: {
      canonical: canonicalPath
    },
    description: cleanDescription,
    title: metaTitle
  };

  if (cleanImage) {
    metadata.openGraph = {
      description: cleanDescription,
      images: [cleanImage],
      title: metaTitle,
      type: "article"
    };
    metadata.twitter = {
      card: "summary_large_image",
      description: cleanDescription,
      images: [cleanImage],
      title: metaTitle
    };
  } else {
    metadata.openGraph = {
      description: cleanDescription,
      title: metaTitle,
      type: "article"
    };
    metadata.twitter = {
      card: "summary",
      description: cleanDescription,
      title: metaTitle
    };
  }

  return metadata;
}

function summarize(value: string): string {
  const text = value.trim();
  if (text.length <= 160) {
    return text;
  }

  return `${text.slice(0, 157)}...`;
}

function missingTitle(kind: DetailKind): string {
  if (kind === "post") return "\u5185\u5BB9\u672A\u627E\u5230";
  if (kind === "album") return "\u76F8\u518C\u672A\u627E\u5230";
  return "\u89C6\u9891\u672A\u627E\u5230";
}

function missingDescription(kind: DetailKind): string {
  if (kind === "post") return "\u5F53\u524D\u5185\u5BB9\u4E0D\u5B58\u5728\u6216\u5C1A\u672A\u516C\u5F00\u3002";
  if (kind === "album") return "\u5F53\u524D\u76F8\u518C\u4E0D\u5B58\u5728\u6216\u5C1A\u672A\u516C\u5F00\u3002";
  return "\u5F53\u524D\u89C6\u9891\u4E0D\u5B58\u5728\u6216\u5C1A\u672A\u516C\u5F00\u3002";
}
