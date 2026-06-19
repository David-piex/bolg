import type { MembershipLevel } from "@/domain/membership";
import type { getDictionary } from "@/i18n/dictionaries";

type Dictionary = ReturnType<typeof getDictionary>;

export function MembershipBadge({
  level,
  dictionary
}: {
  level: MembershipLevel;
  dictionary: Dictionary;
}) {
  return <span className={`tier-badge tier-${level}`}>{dictionary.membership[level]}</span>;
}
