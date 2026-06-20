import type { MembershipLevel } from "@/domain/membership";
import { uploadImage, uploadVideo } from "@/services/java-api-client";

export type ImageUploadClientInput = {
  accessToken: string;
  contentType: string;
  fileName: string;
  visibility: MembershipLevel;
};

export type ImageFileUploadInput = {
  accessToken: string;
  file: File;
  visibility: MembershipLevel;
};

export type UploadedImage = {
  mediaAssetId: string;
  path: string;
  publicUrl: string;
};

export type VideoFileUploadInput = {
  accessToken: string;
  collectionId: string;
  file: File;
  visibility: Exclude<MembershipLevel, "public">;
};

export type UploadedVideo = {
  mediaAssetId: string;
  playbackUrl: string;
  thumbnailUrl: string;
};

const imageUploadLimitBytes = 10 * 1024 * 1024;
const videoUploadLimitBytes = 100 * 1024 * 1024;
const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function validateImageFile(file: File): string | null {
  if (!supportedImageTypes.has(file.type)) {
    return "图片只支持 JPG、PNG、WebP 或 GIF。";
  }

  if (file.size > imageUploadLimitBytes) {
    return "图片不能超过 10MB。";
  }

  return null;
}

export function validateVideoFile(file: File): string | null {
  if (!file.type.startsWith("video/")) {
    return "请选择视频文件。";
  }

  if (file.size > videoUploadLimitBytes) {
    return "视频不能超过 100MB。";
  }

  return null;
}

export async function uploadImageFile(input: ImageFileUploadInput): Promise<UploadedImage> {
  const validationError = validateImageFile(input.file);

  if (validationError) {
    throw new Error(validationError);
  }

  const uploaded = await uploadImage(input.file);

  return {
    mediaAssetId: uploaded.id,
    path: uploaded.objectKey,
    publicUrl: `/api/media/${uploaded.id}/view`
  };
}

export async function uploadVideoFile(input: VideoFileUploadInput): Promise<UploadedVideo> {
  const validationError = validateVideoFile(input.file);

  if (validationError) {
    throw new Error(validationError);
  }

  const uploaded = await uploadVideo(input.file);

  return {
    mediaAssetId: uploaded.id,
    playbackUrl: `/api/media/${uploaded.id}/view`,
    thumbnailUrl: ""
  };
}
