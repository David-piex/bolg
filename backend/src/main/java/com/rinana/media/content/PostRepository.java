package com.rinana.media.content;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PostRepository extends JpaRepository<PostEntity, UUID> {
  List<PostEntity> findByStatusOrderByPublishedAtDesc(ContentStatus status);

  @Query("""
    select post from PostEntity post
    join post.mediaItems mediaItem
    where post.status = :status
      and mediaItem.mediaAsset.id = :mediaAssetId
    """)
  Optional<PostEntity> findPublishedByMediaAssetId(
    @Param("mediaAssetId") UUID mediaAssetId,
    @Param("status") ContentStatus status
  );
}
