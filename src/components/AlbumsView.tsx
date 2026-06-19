"use client";

import { ContentCard } from "@/components/ContentCard";
import { getAlbums } from "@/data/repository";
import type { getDictionary } from "@/i18n/dictionaries";
import { useAppState } from "@/state/AppStateProvider";

type Dictionary = ReturnType<typeof getDictionary>;

function formatCount(count: number, unit: string) {
  if (/[\u4e00-\u9fff]/.test(unit)) {
    return `${count}${unit}`;
  }

  return `${count} ${unit}`;
}

export function AlbumsView({ dictionary }: { dictionary: Dictionary }) {
  const { viewer, albums: stateAlbums, photos } = useAppState();
  const albums = getAlbums(viewer, { albums: stateAlbums, photos });

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">{dictionary.content.albums}</span>
        <h1>{dictionary.nav.albums}</h1>
        <p>{dictionary.content.albumsDescription}</p>
      </section>
      <div className="media-grid">
        {albums.map((album) => (
          <ContentCard
            key={album.id}
            title={album.title}
            excerpt={album.description}
            coverImage={album.coverImage}
            requiredLevel={album.defaultVisibility}
            dictionary={dictionary}
            meta={formatCount(album.photos.length, dictionary.content.photoUnit)}
          />
        ))}
      </div>
    </div>
  );
}
