"use client";

import { ContentCard } from "@/components/ContentCard";
import { getPosts } from "@/data/repository";
import type { getDictionary } from "@/i18n/dictionaries";
import { useAppState } from "@/state/AppStateProvider";

type Dictionary = ReturnType<typeof getDictionary>;

function formatVisibilityLevels(dictionary: Dictionary) {
  return [
    dictionary.membership.public,
    dictionary.membership.normal,
    dictionary.membership.gold,
    dictionary.membership.diamond
  ].join(" / ");
}

export function PostsView({ dictionary }: { dictionary: Dictionary }) {
  const { viewer, posts: statePosts } = useAppState();
  const posts = getPosts(viewer, { posts: statePosts });

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">{dictionary.content.posts}</span>
        <h1>{dictionary.nav.posts}</h1>
        <p>
          {dictionary.content.visibility}
          {dictionary.common.colon}
          {formatVisibilityLevels(dictionary)}
        </p>
      </section>
      <div className="feed-grid">
        {posts.map((post) => (
          <ContentCard
            key={post.id}
            title={post.title}
            excerpt={post.excerpt}
            coverImage={post.coverImage}
            requiredLevel={post.visibility}
            dictionary={dictionary}
            meta={post.publishedAt}
          />
        ))}
      </div>
    </div>
  );
}
