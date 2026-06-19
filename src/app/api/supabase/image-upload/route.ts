import { NextResponse } from "next/server";
import { createSignedImageUpload, requireAdminRequest } from "@/services/supabase-boundary";
import type { MembershipLevel } from "@/domain/membership";

const imageLevels: MembershipLevel[] = ["public", "normal", "gold", "diamond"];

function isVisibility(value: unknown): value is MembershipLevel {
  return typeof value === "string" && imageLevels.includes(value as MembershipLevel);
}

export async function POST(request: Request) {
  try {
    await requireAdminRequest(request);
  } catch {
    return NextResponse.json({ error: "Admin authorization is required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    contentType?: unknown;
    fileName?: unknown;
    visibility?: unknown;
  } | null;

  if (
    !body ||
    typeof body.contentType !== "string" ||
    !body.contentType.startsWith("image/") ||
    typeof body.fileName !== "string" ||
    !isVisibility(body.visibility)
  ) {
    return NextResponse.json({ error: "Invalid Supabase image upload request" }, { status: 400 });
  }

  try {
    return NextResponse.json(
      await createSignedImageUpload({
        contentType: body.contentType,
        fileName: body.fileName,
        visibility: body.visibility
      })
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create Supabase image upload URL" },
      { status: 500 }
    );
  }
}
