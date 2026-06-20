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
  const hasCoverImage = Boolean(coverImage.trim());
  const mediaStyle = hasCoverImage ? { backgroundImage: `url(${coverImage})` } : undefined;

  return (
    <article className="content-card">
      <div
        aria-label={`${title}${dictionary.common.chinese === "中文版" ? "封面" : " cover"}`}
        className={`card-media${hasCoverImage ? "" : " card-media-empty"}`}
        style={mediaStyle}
      >
        <span className="media-grain" aria-hidden="true" />
        {!hasCoverImage ? <span className="media-empty-label">{dictionary.content.noCover}</span> : null}
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
