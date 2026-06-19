import { NextResponse } from "next/server";
import { registerWithInvite } from "@/services/supabase-auth-boundary";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    displayName?: unknown;
    email?: unknown;
    inviteCode?: unknown;
    password?: unknown;
  } | null;

  if (
    !body ||
    typeof body.displayName !== "string" ||
    typeof body.email !== "string" ||
    typeof body.inviteCode !== "string" ||
    typeof body.password !== "string" ||
    !body.email.trim() ||
    !body.inviteCode.trim() ||
    body.password.length < 8
  ) {
    return NextResponse.json({ error: "Invalid registration request" }, { status: 400 });
  }

  try {
    return NextResponse.json(
      await registerWithInvite({
        displayName: body.displayName,
        email: body.email,
        inviteCode: body.inviteCode,
        password: body.password
      })
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed" },
      { status: 400 }
    );
  }
}
