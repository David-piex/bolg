import { LockKeyhole, PlayCircle } from "lucide-react";
import { MembershipBadge } from "@/components/MembershipBadge";
import type { MembershipLevel } from "@/domain/membership";
import type { getDictionary } from "@/i18n/dictionaries";

type Dictionary = ReturnType<typeof getDictionary>;

export function ContentCard({
  title,
  excerpt,
  coverImage,
  requiredLevel,
  dictionary,
  meta,
  video = false
}: {
  title: string;
  excerpt: string;
  coverImage: string;
  requiredLevel: MembershipLevel;
  dictionary: Dictionary;
  meta?: string;
  video?: boolean;
}) {
  return (
    <article className="content-card">
      <div className="card-media" style={{ backgroundImage: `url(${coverImage})` }}>
        <span className="media-grain" aria-hidden="true" />
        {meta ? <span className="media-label">{meta}</span> : null}
        {video ? (
          <span className="media-icon" aria-hidden="true">
            <PlayCircle size={34} />
          </span>
        ) : null}
      </div>
      <div className="card-body">
        <div className="card-meta">
          <MembershipBadge level={requiredLevel} dictionary={dictionary} />
          {requiredLevel !== "public" ? <LockKeyhole size={15} aria-hidden="true" /> : null}
          <span>{dictionary.content.archiveEntry}</span>
        </div>
        <h3>{title}</h3>
        <p>{excerpt}</p>
      </div>
    </article>
  );
}
