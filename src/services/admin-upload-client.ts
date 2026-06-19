import type { MembershipLevel } from "@/domain/membership";
import type { CloudinarySignedVideoUpload } from "@/services/cloudinary-boundary";

export type ImageUploadClientInput = {
  accessToken: string;
  contentType: string;
  fileName: string;
  visibility: MembershipLevel;
};

export type SignedImageUpload = {
  path: string;
  token: string;
  uploadUrl: string;
};

export type VideoUploadSignatureClientInput = {
  accessToken: string;
  collectionId: string;
  fileName: string;
  visibility: Exclude<MembershipLevel, "public">;
};

export type ImageFileUploadInput = {
  accessToken: string;
  file: File;
  visibility: MembershipLevel;
};

export type UploadedImage = {
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
  cloudinaryPublicId: string;
  playbackUrl: string;
  thumbnailUrl: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(body.error || "Admin upload request failed");
  }

  return body;
}

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };
}

export async function createImageUpload(input: ImageUploadClientInput): Promise<SignedImageUpload> {
  const response = await fetch("/api/supabase/image-upload", {
    body: JSON.stringify({
      contentType: input.contentType,
      fileName: input.fileName,
      visibility: input.visibility
    }),
    headers: authHeaders(input.accessToken),
    method: "POST"
  });

  return readJson<SignedImageUpload>(response);
}

export async function createVideoUploadSignature(
  input: VideoUploadSignatureClientInput
): Promise<CloudinarySignedVideoUpload> {
  const response = await fetch("/api/cloudinary/video-signature", {
    body: JSON.stringify({
      collectionId: input.collectionId,
      fileName: input.fileName,
      visibility: input.visibility
    }),
    headers: authHeaders(input.accessToken),
    method: "POST"
  });

  return readJson<CloudinarySignedVideoUpload>(response);
}

function supabasePublicImageUrl(uploadUrl: string, path: string): string {
  const url = new URL(uploadUrl);
  return `${url.origin}/storage/v1/object/public/images/${path}`;
}

async function assertUploadOk(response: Response, operation: string) {
  if (response.ok) {
    return;
  }

  throw new Error(`${operation} failed with ${response.status}`);
}

export async function uploadImageFile(input: ImageFileUploadInput): Promise<UploadedImage> {
  const signed = await createImageUpload({
    accessToken: input.accessToken,
    contentType: input.file.type || "application/octet-stream",
    fileName: input.file.name,
    visibility: input.visibility
  });

  const response = await fetch(signed.uploadUrl, {
    body: input.file,
    headers: { "Content-Type": input.file.type || "application/octet-stream" },
    method: "PUT"
  });

  await assertUploadOk(response, "Supabase image upload");

  return {
    path: signed.path,
    publicUrl: supabasePublicImageUrl(signed.uploadUrl, signed.path)
  };
}

export async function uploadVideoFile(input: VideoFileUploadInput): Promise<UploadedVideo> {
  const signed = await createVideoUploadSignature({
    accessToken: input.accessToken,
    collectionId: input.collectionId,
    fileName: input.file.name,
    visibility: input.visibility
  });
  const form = new FormData();
  form.set("file", input.file);
  form.set("api_key", signed.apiKey);
  form.set("folder", signed.folder);
  form.set("public_id", signed.publicId);
  form.set("resource_type", signed.resourceType);
  form.set("signature", signed.signature);
  form.set("tags", signed.tags.join(","));
  form.set("timestamp", String(signed.timestamp));

  const response = await fetch(signed.uploadUrl, {
    body: form,
    method: "POST"
  });
  const body = (await response.json().catch(() => ({}))) as {
    public_id?: string;
    secure_url?: string;
  };

  if (!response.ok || !body.secure_url) {
    throw new Error("Cloudinary video upload failed");
  }

  const publicId = body.public_id || signed.publicId;

  return {
    cloudinaryPublicId: publicId,
    playbackUrl: body.secure_url,
    thumbnailUrl: `https://res.cloudinary.com/${signed.cloudName}/video/upload/so_0/${publicId}.jpg`
  };
}
