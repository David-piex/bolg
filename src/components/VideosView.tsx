"use client";

import { ContentCard } from "@/components/ContentCard";
import { getVideoCollections } from "@/data/repository";
import type { getDictionary } from "@/i18n/dictionaries";
import { useAppState } from "@/state/AppStateProvider";

type Dictionary = ReturnType<typeof getDictionary>;

function formatCount(count: number, unit: string) {
  if (/[\u4e00-\u9fff]/.test(unit)) {
    return `${count}${unit}`;
  }

  return `${count} ${unit}`;
}

export function VideosView({ dictionary }: { dictionary: Dictionary }) {
  const { viewer, videoCollections, videos } = useAppState();
  const collections = getVideoCollections(viewer, { videoCollections, videos });

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">{dictionary.content.videos}</span>
        <h1>{dictionary.nav.videos}</h1>
        <p>{dictionary.content.videosDescription}</p>
      </section>
      <div className="media-grid">
        {collections.map((collection) => (
          <ContentCard
            key={collection.id}
            title={collection.title}
            excerpt={collection.description}
            coverImage={collection.coverImage}
            requiredLevel={collection.defaultVisibility}
            dictionary={dictionary}
            meta={formatCount(collection.videos.length, dictionary.content.videoUnit)}
            video
          />
        ))}
      </div>
    </div>
  );
}
