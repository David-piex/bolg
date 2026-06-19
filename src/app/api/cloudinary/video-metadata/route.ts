import { NextResponse } from "next/server";
import { fetchVideoMetadata } from "@/services/cloudinary-boundary";
import { requireAdminRequest } from "@/services/supabase-boundary";

export async function POST(request: Request) {
  try {
    await requireAdminRequest(request);
  } catch {
    return NextResponse.json({ error: "Admin authorization is required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { publicId?: unknown } | null;

  if (!body || typeof body.publicId !== "string" || !body.publicId.trim()) {
    return NextResponse.json({ error: "Cloudinary publicId is required" }, { status: 400 });
  }

  try {
    return NextResponse.json(await fetchVideoMetadata(body.publicId.trim()));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch Cloudinary video metadata" },
      { status: 500 }
    );
  }
}
