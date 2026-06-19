import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSignedVideoUpload, fetchVideoMetadata } from "@/services/cloudinary-boundary";

const originalEnv = { ...process.env };

function expectedSignature(params: Record<string, string | number>, secret: string) {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1").update(`${payload}${secret}`).digest("hex");
}

describe("cloudinary boundary", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it("creates a signed video upload payload from server-only Cloudinary credentials", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_781_000_000_000);
    process.env.CLOUDINARY_CLOUD_NAME = "demo-cloud";
    process.env.CLOUDINARY_API_KEY = "api-key";
    process.env.CLOUDINARY_API_SECRET = "api-secret";
    process.env.CLOUDINARY_UPLOAD_FOLDER = "rinana/videos";

    const result = await createSignedVideoUpload({
      fileName: "gold trailer.mp4",
      visibility: "gold",
      collectionId: "collection-1"
    });

    const signedParams = {
      folder: "rinana/videos",
      public_id: "collection-1/gold-trailer",
      resource_type: "video",
      tags: "visibility:gold,collection:collection-1",
      timestamp: 1_781_000_000
    };

    expect(result).toEqual({
      apiKey: "api-key",
      cloudName: "demo-cloud",
      folder: "rinana/videos",
      publicId: "collection-1/gold-trailer",
      resourceType: "video",
      signature: expectedSignature(signedParams, "api-secret"),
      tags: ["visibility:gold", "collection:collection-1"],
      timestamp: 1_781_000_000,
      uploadUrl: "https://api.cloudinary.com/v1_1/demo-cloud/video/upload"
    });
  });

  it("reports missing Cloudinary credentials before creating a signature", async () => {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;

    await expect(
      createSignedVideoUpload({
        fileName: "clip.mp4",
        visibility: "diamond",
        collectionId: "collection-2"
      })
    ).rejects.toThrow("Missing Cloudinary environment variables");
  });

  it("maps Cloudinary metadata into playback fields", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "demo-cloud";
    process.env.CLOUDINARY_API_KEY = "api-key";
    process.env.CLOUDINARY_API_SECRET = "api-secret";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          eager: [{ secure_url: "https://res.cloudinary.com/demo/video/upload/v1/processed.mp4" }],
          secure_url: "https://res.cloudinary.com/demo/video/upload/v1/original.mp4",
          public_id: "rinana/videos/clip",
          status: "active"
        })
      })) as unknown as typeof fetch
    );

    await expect(fetchVideoMetadata("rinana/videos/clip")).resolves.toEqual({
      playbackUrl: "https://res.cloudinary.com/demo/video/upload/v1/processed.mp4",
      processingState: "ready",
      publicId: "rinana/videos/clip",
      thumbnailUrl: "https://res.cloudinary.com/demo-cloud/video/upload/so_0/rinana/videos/clip.jpg"
    });
  });
});
