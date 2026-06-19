import { NextResponse } from "next/server";
import { fetchContentDataset } from "@/services/supabase-content-boundary";
import {
  persistAlbumWithPhoto,
  persistPost,
  persistVideoCollectionWithVideo,
  requireAdminRequest
} from "@/services/supabase-boundary";
import type { MembershipLevel } from "@/domain/membership";

const contentLevels: MembershipLevel[] = ["public", "normal", "gold", "diamond"];

function isVisibility(value: unknown): value is MembershipLevel {
  return typeof value === "string" && contentLevels.includes(value as MembershipLevel);
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function bearerTokenFromRequest(request: Request): string | undefined {
  const header = request.headers.get("authorization");
  const prefix = "Bearer ";

  if (!header?.startsWith(prefix)) {
    return undefined;
  }

  const token = header.slice(prefix.length).trim();
  return token || undefined;
}

export async function GET(request: Request) {
  try {
    const dataset = await fetchContentDataset(bearerTokenFromRequest(request));
    return NextResponse.json(dataset);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Content read failed";

    if (message.includes("Missing Supabase content environment variables")) {
      return NextResponse.json({ error: "Supabase content is not configured" }, { status: 503 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let admin: { userId: string };

  try {
    admin = await requireAdminRequest(request);
  } catch {
    return NextResponse.json({ error: "Admin authorization is required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body || !isText(body.kind) || !isText(body.title) || !isVisibility(body.visibility)) {
    return NextResponse.json({ error: "Invalid content publish request" }, { status: 400 });
  }

  try {
    if (body.kind === "post") {
      if (!isText(body.body)) {
        return NextResponse.json({ error: "Invalid content publish request" }, { status: 400 });
      }

      return NextResponse.json({
        post: await persistPost({
          body: body.body,
          coverImage: typeof body.coverImage === "string" ? body.coverImage : undefined,
          title: body.title,
          userId: admin.userId,
          visibility: body.visibility
        })
      });
    }

    if (body.kind === "album") {
      if (!isText(body.description) || !isText(body.photoTitle)) {
        return NextResponse.json({ error: "Invalid content publish request" }, { status: 400 });
      }

      return NextResponse.json(
        await persistAlbumWithPhoto({
          description: body.description,
          imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : undefined,
          photoTitle: body.photoTitle,
          title: body.title,
          userId: admin.userId,
          visibility: body.visibility
        })
      );
    }

    if (body.kind === "video") {
      if (!isText(body.description) || !isText(body.videoTitle)) {
        return NextResponse.json({ error: "Invalid content publish request" }, { status: 400 });
      }

      return NextResponse.json(
        await persistVideoCollectionWithVideo({
          cloudinaryPublicId: typeof body.cloudinaryPublicId === "string" ? body.cloudinaryPublicId : undefined,
          description: body.description,
          playbackUrl: typeof body.playbackUrl === "string" ? body.playbackUrl : undefined,
          thumbnailUrl: typeof body.thumbnailUrl === "string" ? body.thumbnailUrl : undefined,
          title: body.title,
          userId: admin.userId,
          videoTitle: body.videoTitle,
          visibility: body.visibility
        })
      );
    }

    return NextResponse.json({ error: "Invalid content publish request" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to publish content" },
      { status: 500 }
    );
  }
}
