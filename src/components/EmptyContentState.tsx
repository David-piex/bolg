import type { getDictionary } from "@/i18n/dictionaries";

type Dictionary = ReturnType<typeof getDictionary>;

export function EmptyContentState({
  dictionary,
  label
}: {
  dictionary: Dictionary;
  label?: string;
}) {
  return (
    <div className="empty-content-state">
      {label ? <span className="eyebrow">{label}</span> : null}
      <h2>{dictionary.content.emptyTitle}</h2>
      <p>{dictionary.content.emptyHint}</p>
    </div>
  );
}
