import type { MembershipLevel } from "@/domain/membership";
import {
  completeDirectUpload,
  createDirectUpload,
  uploadImage,
  uploadVideo,
  type JavaMediaAsset,
  type JavaMediaType
} from "@/services/java-api-client";

export type ImageUploadClientInput = {
  accessToken: string;
  contentType: string;
  fileName: string;
  visibility: MembershipLevel;
};

export type ImageFileUploadInput = {
  accessToken: string;
  file: File;
  onProgress?: (progress: UploadProgress) => void;
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
  onProgress?: (progress: UploadProgress) => void;
  visibility: Exclude<MembershipLevel, "public">;
};

export type UploadedVideo = {
  mediaAssetId: string;
  playbackUrl: string;
  thumbnailUrl: string;
};

export type UploadProgressPhase = "preparing" | "uploading" | "finalizing" | "fallback" | "complete";

export type UploadProgress = {
  percent: number;
  phase: UploadProgressPhase;
};

const imageUploadLimitBytes = 10 * 1024 * 1024;
const videoUploadLimitBytes = 95 * 1024 * 1024;
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
    return "视频不能超过 95MB。";
  }

  return null;
}

export async function uploadImageFile(input: ImageFileUploadInput): Promise<UploadedImage> {
  const validationError = validateImageFile(input.file);

  if (validationError) {
    throw new Error(validationError);
  }

  const uploaded = await uploadWithDirectFallback(input.file, "IMAGE", () => uploadImage(input.file), input.onProgress);

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

  const uploaded = await uploadWithDirectFallback(input.file, "VIDEO", () => uploadVideo(input.file), input.onProgress);

  return {
    mediaAssetId: uploaded.id,
    playbackUrl: `/api/media/${uploaded.id}/view`,
    thumbnailUrl: ""
  };
}

async function uploadWithDirectFallback(
  file: File,
  mediaType: JavaMediaType,
  fallbackUpload: () => Promise<JavaMediaAsset>,
  onProgress?: (progress: UploadProgress) => void
): Promise<JavaMediaAsset> {
  const emitProgress = (phase: UploadProgressPhase, percent: number) => {
    onProgress?.({ phase, percent: clampUploadPercent(percent) });
  };

  try {
    emitProgress("preparing", 3);
    const upload = await createDirectUpload({
      mediaType,
      mimeType: file.type || "application/octet-stream",
      originalName: file.name || "upload",
      sizeBytes: file.size
    });

    emitProgress("uploading", 8);
    await putObjectWithProgress(upload.uploadUrl, file, (percent) => emitProgress("uploading", percent));

    emitProgress("finalizing", 98);
    const completed = await completeDirectUpload({
      bucketName: upload.bucketName,
      mediaType,
      mimeType: file.type || upload.mimeType,
      objectKey: upload.objectKey,
      originalName: file.name || "upload",
      sizeBytes: file.size
    });
    emitProgress("complete", 100);
    return completed;
  } catch {
    emitProgress("fallback", 12);
    const uploaded = await fallbackUpload();
    emitProgress("complete", 100);
    return uploaded;
  }
}

function putObjectWithProgress(
  uploadUrl: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("PUT", uploadUrl);
    if (file.type) {
      xhr.setRequestHeader("Content-Type", file.type);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) {
        return;
      }

      onProgress(Math.min(95, Math.max(8, Math.round((event.loaded / event.total) * 95))));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }

      reject(new Error("DIRECT_UPLOAD_PUT_FAILED"));
    };
    xhr.onerror = () => reject(new Error("DIRECT_UPLOAD_PUT_FAILED"));
    xhr.onabort = () => reject(new Error("DIRECT_UPLOAD_ABORTED"));
    xhr.send(file);
  });
}

function clampUploadPercent(percent: number) {
  return Math.min(100, Math.max(0, Math.round(percent)));
}
