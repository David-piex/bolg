import type { InviteTargetLevel } from "@/domain/invites";

export type RegisterWithInviteInput = {
  displayName: string;
  email: string;
  inviteCode: string;
  password: string;
};

export type RegisteredUser = {
  email: string;
  level: InviteTargetLevel;
  userId: string;
};

export type LoginWithPasswordInput = {
  email: string;
  password: string;
};

export type AuthenticatedProfile = {
  disabled: boolean;
  displayName: string;
  email: string;
  isAdmin: boolean;
  level: InviteTargetLevel;
  userId: string;
};

export type LoginSession = {
  accessToken: string;
  expiresIn: number;
  profile: AuthenticatedProfile;
  refreshToken: string;
};

type SupabaseAuthConfig = {
  anonKey: string;
  serviceRoleKey: string;
  url: string;
};

type InviteLookupRow = {
  id: string;
  target_level: InviteTargetLevel;
  used_by_user_id: string | null;
};

type CreatedAuthUser = {
  email?: string;
  id?: string;
  user?: {
    email?: string;
    id?: string;
  };
};

type LoginAuthResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  user?: {
    email?: string;
    id?: string;
  };
};

type ProfileRow = {
  disabled: boolean;
  display_name: string;
  email: string;
  id: string;
  is_admin: boolean;
  level: InviteTargetLevel;
};

function requireSupabaseAuthConfig(): SupabaseAuthConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return {
    anonKey,
    serviceRoleKey,
    url: url.replace(/\/+$/, "")
  };
}

function serviceHeaders(config: SupabaseAuthConfig, extraHeaders: Record<string, string> = {}) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    "Content-Type": "application/json",
    ...extraHeaders
  };
}

function anonHeaders(config: SupabaseAuthConfig, extraHeaders: Record<string, string> = {}) {
  return {
    apikey: config.anonKey,
    "Content-Type": "application/json",
    ...extraHeaders
  };
}

async function assertOk(response: Response, operation: string) {
  if (response.ok) {
    return;
  }

  const details = await response.text().catch(() => "");
  throw new Error(`${operation} failed with ${response.status}${details ? `: ${details}` : ""}`);
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function mapProfile(row: ProfileRow): AuthenticatedProfile {
  return {
    disabled: row.disabled,
    displayName: row.display_name,
    email: row.email,
    isAdmin: row.is_admin,
    level: row.level,
    userId: row.id
  };
}

export async function registerWithInvite(input: RegisterWithInviteInput): Promise<RegisteredUser> {
  const config = requireSupabaseAuthConfig();
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim() || email;
  const inviteCode = normalizeCode(input.inviteCode);

  const inviteResponse = await fetch(
    `${config.url}/rest/v1/invite_codes?code=eq.${encodeURIComponent(inviteCode)}&select=id,target_level,used_by_user_id`,
    {
      headers: serviceHeaders(config)
    }
  );

  await assertOk(inviteResponse, "registerWithInvite invite lookup");

  const invites = (await inviteResponse.json()) as InviteLookupRow[];
  const invite = invites[0];

  if (!invite || invite.used_by_user_id) {
    throw new Error("Invite code is invalid");
  }

  const createUserResponse = await fetch(`${config.url}/auth/v1/admin/users`, {
    body: JSON.stringify({
      email,
      email_confirm: true,
      password: input.password,
      user_metadata: { display_name: displayName }
    }),
    headers: serviceHeaders(config),
    method: "POST"
  });

  await assertOk(createUserResponse, "registerWithInvite create auth user");

  const authUser = (await createUserResponse.json()) as CreatedAuthUser;
  const userId = authUser.id || authUser.user?.id;

  if (!userId) {
    throw new Error("Supabase did not return a created user id");
  }

  const consumeInviteResponse = await fetch(`${config.url}/rest/v1/rpc/consume_invite_for_user`, {
    body: JSON.stringify({
      invite_code: inviteCode,
      profile_display_name: displayName,
      profile_email: email,
      profile_user_id: userId
    }),
    headers: serviceHeaders(config),
    method: "POST"
  });

  await assertOk(consumeInviteResponse, "registerWithInvite consume invite");

  const consumedRows = (await consumeInviteResponse.json()) as Array<{ level: InviteTargetLevel }>;
  const consumed = consumedRows[0];

  if (!consumed) {
    throw new Error("Invite consumption did not return a profile");
  }

  return {
    email: authUser.email || authUser.user?.email || email,
    level: consumed.level,
    userId
  };
}

export async function loginWithPassword(input: LoginWithPasswordInput): Promise<LoginSession> {
  const config = requireSupabaseAuthConfig();
  const email = input.email.trim().toLowerCase();
  const authResponse = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    body: JSON.stringify({ email, password: input.password }),
    headers: anonHeaders(config),
    method: "POST"
  });

  await assertOk(authResponse, "loginWithPassword token");

  const auth = (await authResponse.json()) as LoginAuthResponse;
  const userId = auth.user?.id;

  if (!auth.access_token || !auth.refresh_token || !auth.expires_in || !userId) {
    throw new Error("Supabase login did not return a complete session");
  }

  const profileResponse = await fetch(
    `${config.url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,display_name,email,level,disabled,is_admin`,
    {
      headers: serviceHeaders(config)
    }
  );

  await assertOk(profileResponse, "loginWithPassword profile");

  const profiles = (await profileResponse.json()) as ProfileRow[];
  const profile = profiles[0];

  if (!profile) {
    throw new Error("Supabase profile was not found");
  }

  return {
    accessToken: auth.access_token,
    expiresIn: auth.expires_in,
    profile: mapProfile(profile),
    refreshToken: auth.refresh_token
  };
}
