import { createHash } from "node:crypto";
import type { MembershipLevel } from "@/domain/membership";

export type CloudinaryVideoUploadRequest = {
  fileName: string;
  visibility: MembershipLevel;
  collectionId: string;
};

export type CloudinaryVideoMetadata = {
  publicId: string;
  playbackUrl: string;
  thumbnailUrl: string;
  processingState: "ready" | "processing";
};

export type CloudinarySignedVideoUpload = {
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
  resourceType: "video";
  signature: string;
  tags: string[];
  timestamp: number;
  uploadUrl: string;
};

type CloudinaryConfig = {
  apiKey: string;
  apiSecret: string;
  cloudName: string;
  uploadFolder: string;
};

function requireCloudinaryConfig(): CloudinaryConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const uploadFolder = process.env.CLOUDINARY_UPLOAD_FOLDER || "rinana/videos";

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Missing Cloudinary environment variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET");
  }

  return { apiKey, apiSecret, cloudName, uploadFolder };
}

function slugifyFileBase(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const slug = withoutExtension
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "video";
}

function createSignature(params: Record<string, string | number>, apiSecret: string): string {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

export async function createSignedVideoUpload(
  request: CloudinaryVideoUploadRequest
): Promise<CloudinarySignedVideoUpload> {
  const config = requireCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${request.collectionId}/${slugifyFileBase(request.fileName)}`;
  const tags = [`visibility:${request.visibility}`, `collection:${request.collectionId}`];
  const signedParams = {
    folder: config.uploadFolder,
    public_id: publicId,
    resource_type: "video",
    tags: tags.join(","),
    timestamp
  };

  return {
    apiKey: config.apiKey,
    cloudName: config.cloudName,
    folder: config.uploadFolder,
    publicId,
    resourceType: "video",
    signature: createSignature(signedParams, config.apiSecret),
    tags,
    timestamp,
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/video/upload`
  };
}

export async function fetchVideoMetadata(publicId: string): Promise<CloudinaryVideoMetadata> {
  const config = requireCloudinaryConfig();
  const encodedPublicId = encodeURIComponent(publicId);
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/resources/video/upload/${encodedPublicId}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64")}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Cloudinary metadata request failed with ${response.status}`);
  }

  const data = (await response.json()) as {
    eager?: Array<{ secure_url?: string }>;
    public_id?: string;
    secure_url?: string;
    status?: string;
  };
  const resolvedPublicId = data.public_id || publicId;
  const playbackUrl = data.eager?.find((item) => item.secure_url)?.secure_url || data.secure_url;

  if (!playbackUrl) {
    throw new Error("Cloudinary metadata did not include a playback URL");
  }

  return {
    publicId: resolvedPublicId,
    playbackUrl,
    thumbnailUrl: `https://res.cloudinary.com/${config.cloudName}/video/upload/so_0/${resolvedPublicId}.jpg`,
    processingState: data.status === "active" ? "ready" : "processing"
  };
}
