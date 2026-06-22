import Link from "next/link";
import { memo, useEffect, useState } from "react";
import { LockKeyhole, PlayCircle } from "lucide-react";
import { MembershipBadge } from "@/components/MembershipBadge";
import type { MembershipLevel } from "@/domain/membership";
import type { getDictionary } from "@/i18n/dictionaries";

type Dictionary = ReturnType<typeof getDictionary>;

function ContentCardComponent({
  title,
  excerpt,
  coverImage,
  requiredLevel,
  dictionary,
  meta,
  href,
  video = false
}: {
  title: string;
  excerpt: string;
  coverImage: string;
  requiredLevel: MembershipLevel;
  dictionary: Dictionary;
  meta?: string;
  href?: string;
  video?: boolean;
}) {
  const normalizedCoverImage = coverImage.trim();
  const [failedCoverImage, setFailedCoverImage] = useState<string | null>(null);
  const hasCoverImage = Boolean(normalizedCoverImage) && failedCoverImage !== normalizedCoverImage;
  const coverLabel = `${title}${dictionary.common.chinese === "中文版" ? "封面" : " cover"}`;

  useEffect(() => {
    setFailedCoverImage(null);
  }, [normalizedCoverImage]);

  const body = (
    <>
      <div
        aria-label={hasCoverImage ? undefined : coverLabel}
        className={`card-media${hasCoverImage ? "" : " card-media-empty"}`}
      >
        {hasCoverImage ? (
          <img
            className="card-media-image"
            src={normalizedCoverImage}
            alt={coverLabel}
            loading="lazy"
            decoding="async"
            onError={() => setFailedCoverImage(normalizedCoverImage)}
          />
        ) : null}
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
        {href ? <span className="card-link-label">{dictionary.content.openDetail}</span> : null}
      </div>
    </>
  );

  return (
    <article className={`content-card${href ? " content-card-linked" : ""}`}>
      {href ? (
        <Link href={href} className="content-card-link" aria-label={`${dictionary.content.openDetail}${dictionary.common.colon}${title}`}>
          {body}
        </Link>
      ) : (
        body
      )}
    </article>
  );
}

export const ContentCard = memo(ContentCardComponent);
