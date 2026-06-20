export type DisplayNameInput = {
  email?: string | null;
  isAdmin?: boolean;
  name?: string | null;
};

export type DisplayNameFallbacks = {
  admin: string;
  user: string;
};

export function hasBrokenDisplayName(value: string | null | undefined): boolean {
  const compact = (value ?? "").trim().replace(/\s+/g, "");

  if (!compact) {
    return true;
  }

  return compact.length >= 3 && /^[?\uFFFD]+$/.test(compact);
}

export function displayNameOrFallback(input: DisplayNameInput, fallbacks: DisplayNameFallbacks): string {
  const trimmedName = input.name?.trim();

  if (!hasBrokenDisplayName(trimmedName)) {
    return trimmedName!;
  }

  if (input.isAdmin) {
    return fallbacks.admin;
  }

  const emailName = input.email?.split("@")[0]?.trim();
  return emailName || fallbacks.user;
}
