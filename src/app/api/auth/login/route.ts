import { NextResponse } from "next/server";
import { loginWithPassword } from "@/services/supabase-auth-boundary";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
  } | null;

  if (
    !body ||
    typeof body.email !== "string" ||
    typeof body.password !== "string" ||
    !body.email.trim() ||
    !body.password
  ) {
    return NextResponse.json({ error: "Invalid login request" }, { status: 400 });
  }

  try {
    return NextResponse.json(
      await loginWithPassword({
        email: body.email,
        password: body.password
      })
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 401 }
    );
  }
}
