package com.rinana.media.content;

import com.rinana.media.common.ContentVisibility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VideoRepository extends JpaRepository<VideoEntity, UUID> {
  List<VideoEntity> findByStatusOrderByPublishedAtDesc(ContentStatus status);

  List<VideoEntity> findByStatusAndVisibilityInOrderByPublishedAtDesc(
    ContentStatus status,
    Collection<ContentVisibility> visibilities
  );

  Page<VideoEntity> findByStatusAndVisibilityIn(
    ContentStatus status,
    Collection<ContentVisibility> visibilities,
    Pageable pageable
  );

  @Query("""
    select video from VideoEntity video
    where video.status = :status
      and video.visibility in :visibilities
      and (
        :query = ''
        or lower(video.title) like lower(concat('%', :query, '%'))
        or lower(video.description) like lower(concat('%', :query, '%'))
      )
    """)
  Page<VideoEntity> searchPublished(
    @Param("status") ContentStatus status,
    @Param("visibilities") Collection<ContentVisibility> visibilities,
    @Param("query") String query,
    Pageable pageable
  );

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
