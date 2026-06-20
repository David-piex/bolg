import "server-only";

import { headers } from "next/headers";
import type { RemoteDetail } from "@/services/content-client";
import {
  detailFromJavaAlbum,
  detailFromJavaPost,
  detailFromJavaVideo,
  javaVideoIdFromCollectionId
} from "@/services/content-client";
import type { JavaAlbum, JavaPost, JavaVideo } from "@/services/java-api-client";

const apiProxyTarget = process.env.RINANA_API_PROXY_TARGET || "http://127.0.0.1:8080";

export async function fetchServerPostDetail(id: string): Promise<RemoteDetail | null> {
  return fetchServerDetail<JavaPost>(`/api/content/posts/${encodeURIComponent(id)}`, detailFromJavaPost);
}

export async function fetchServerAlbumDetail(id: string): Promise<RemoteDetail | null> {
  return fetchServerDetail<JavaAlbum>(`/api/content/albums/${encodeURIComponent(id)}`, detailFromJavaAlbum);
}

export async function fetchServerVideoDetail(id: string): Promise<RemoteDetail | null> {
  return fetchServerDetail<JavaVideo>(
    `/api/content/videos/${encodeURIComponent(javaVideoIdFromCollectionId(id))}`,
    detailFromJavaVideo
  );
}

async function fetchServerDetail<TJava>(
  path: string,
  mapDetail: (item: TJava) => RemoteDetail
): Promise<RemoteDetail | null> {
  const cookie = (await headers()).get("cookie");
  const response = await fetch(`${apiProxyTarget}${path}`, {
    cache: "no-store",
    headers: cookie ? { cookie } : undefined
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  return mapDetail((await response.json()) as TJava);
}
