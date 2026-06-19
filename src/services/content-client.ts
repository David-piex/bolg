import type { ContentDataset } from "@/data/repository";
import type { MembershipLevel } from "@/domain/membership";
import type { AlbumRecord, PhotoRecord, PostRecord, VideoCollectionRecord, VideoRecord } from "@/data/mock-data";

type ErrorBody = {
  error?: string;
};

export type RemotePublishInput =
  | {
      body: string;
      coverImage?: string;
      kind: "post";
      title: string;
      visibility: MembershipLevel;
    }
  | {
      description: string;
      imageUrl?: string;
      kind: "album";
      photoTitle: string;
      title: string;
      visibility: MembershipLevel;
    }
  | {
      cloudinaryPublicId?: string;
      description: string;
      kind: "video";
      playbackUrl?: string;
      thumbnailUrl?: string;
      title: string;
      videoTitle: string;
      visibility: MembershipLevel;
    };

export type RemotePublishResult =
  | { post: PostRecord }
  | { album: AlbumRecord; photo: PhotoRecord }
  | { collection: VideoCollectionRecord; video: VideoRecord };

export async function fetchRemoteContentDataset(accessToken?: string): Promise<ContentDataset> {
  const headers: Record<string, string> = {};

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch("/api/content", {
    headers,
    method: "GET"
  });

  const body = (await response.json()) as ContentDataset | ErrorBody;

  if (!response.ok) {
    throw new Error("error" in body && body.error ? body.error : "Content API failed");
  }

  return body as ContentDataset;
}

export async function publishRemoteContent(
  accessToken: string,
  input: RemotePublishInput
): Promise<RemotePublishResult> {
  const response = await fetch("/api/content", {
    body: JSON.stringify(input),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  const body = (await response.json()) as RemotePublishResult | ErrorBody;

  if (!response.ok) {
    throw new Error("error" in body && body.error ? body.error : "Content publish failed");
  }

  return body as RemotePublishResult;
}
