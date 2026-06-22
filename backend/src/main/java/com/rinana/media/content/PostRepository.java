package com.rinana.media.content;

import com.rinana.media.common.ContentVisibility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.time.Instant;

public interface PostRepository extends JpaRepository<PostEntity, UUID> {
  List<PostEntity> findByStatusOrderByPublishedAtDesc(ContentStatus status);

  List<PostEntity> findByStatusAndVisibilityInOrderByPublishedAtDesc(
    ContentStatus status,
    Collection<ContentVisibility> visibilities
  );

  Page<PostEntity> findByStatusAndVisibilityIn(
    ContentStatus status,
    Collection<ContentVisibility> visibilities,
    Pageable pageable
  );

  List<PostEntity> findByStatusAndVisibilityIn(
    ContentStatus status,
    Collection<ContentVisibility> visibilities,
    Sort sort
  );

  List<PostEntity> findByStatusIn(
    Collection<ContentStatus> statuses,
    Sort sort
  );

  List<PostEntity> findByStatusAndScheduledAtLessThanEqual(ContentStatus status, Instant scheduledAt);

  @Query("""
    select post from PostEntity post
    where post.status = :status
      and post.visibility in :visibilities
      and (
        :query = ''
        or lower(post.title) like lower(concat('%', :query, '%'))
        or lower(post.content) like lower(concat('%', :query, '%'))
        or lower(coalesce(post.category, '')) like lower(concat('%', :query, '%'))
        or lower(coalesce(post.tags, '')) like lower(concat('%', :query, '%'))
      )
      and (:category = '' or lower(coalesce(post.category, '')) = lower(:category))
      and (:tag = '' or lower(coalesce(post.tags, '')) like lower(concat('%', :tag, '%')))
    """)
  Page<PostEntity> searchPublished(
    @Param("status") ContentStatus status,
    @Param("visibilities") Collection<ContentVisibility> visibilities,
    @Param("query") String query,
    @Param("category") String category,
    @Param("tag") String tag,
    Pageable pageable
  );

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

  @Query("""
    select case when count(post) > 0 then true else false end
    from PostEntity post
    join post.mediaItems mediaItem
    where post.status = :status
      and post.visibility in :visibilities
      and mediaItem.mediaAsset.id = :mediaAssetId
    """)
  boolean existsPublishedWithVisibleMediaAssetId(
    @Param("mediaAssetId") UUID mediaAssetId,
    @Param("status") ContentStatus status,
    @Param("visibilities") Collection<ContentVisibility> visibilities
  );

  @Query("""
    select count(post)
    from PostEntity post
    join post.mediaItems mediaItem
    where mediaItem.mediaAsset.id = :mediaAssetId
      and post.status != 'DELETED'
      and (:excludePostId is null or post.id != :excludePostId)
    """)
  long countByMediaAssetIdExcludingPost(
    @Param("mediaAssetId") UUID mediaAssetId,
    @Param("excludePostId") UUID excludePostId
  );
}
