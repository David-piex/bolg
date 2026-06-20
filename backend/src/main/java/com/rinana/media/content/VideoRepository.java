package com.rinana.media.content;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VideoRepository extends JpaRepository<VideoEntity, UUID> {
  List<VideoEntity> findByStatusOrderByPublishedAtDesc(ContentStatus status);

  @Query("""
    select video from VideoEntity video
    where video.status = :status
      and (video.mediaAsset.id = :mediaAssetId or video.coverMedia.id = :mediaAssetId)
    """)
  Optional<VideoEntity> findPublishedByMediaAssetId(
    @Param("mediaAssetId") UUID mediaAssetId,
    @Param("status") ContentStatus status
  );
}
