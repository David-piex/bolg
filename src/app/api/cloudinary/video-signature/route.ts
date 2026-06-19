import { NextResponse } from "next/server";
import { createSignedVideoUpload } from "@/services/cloudinary-boundary";
import { requireAdminRequest } from "@/services/supabase-boundary";
import type { MembershipLevel } from "@/domain/membership";

const uploadLevels: Array<Exclude<MembershipLevel, "public">> = ["normal", "gold", "diamond"];

function isUploadLevel(value: unknown): value is Exclude<MembershipLevel, "public"> {
  return typeof value === "string" && uploadLevels.includes(value as Exclude<MembershipLevel, "public">);
}

export async function POST(request: Request) {
  try {
    await requireAdminRequest(request);
  } catch {
    return NextResponse.json({ error: "Admin authorization is required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    collectionId?: unknown;
    fileName?: unknown;
    visibility?: unknown;
  } | null;

  if (!body || typeof body.collectionId !== "string" || typeof body.fileName !== "string" || !isUploadLevel(body.visibility)) {
    return NextResponse.json({ error: "Invalid video upload signature request" }, { status: 400 });
  }

  try {
    const signedUpload = await createSignedVideoUpload({
      collectionId: body.collectionId,
      fileName: body.fileName,
      visibility: body.visibility
    });

    return NextResponse.json(signedUpload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create Cloudinary upload signature" },
      { status: 500 }
    );
  }
}
