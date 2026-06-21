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

  @Query("""
    select post from PostEntity post
    where post.status = :status
      and post.visibility in :visibilities
      and (
        :query = ''
        or lower(post.title) like lower(concat('%', :query, '%'))
        or lower(post.content) like lower(concat('%', :query, '%'))
      )
    """)
  Page<PostEntity> searchPublished(
    @Param("status") ContentStatus status,
    @Param("visibilities") Collection<ContentVisibility> visibilities,
    @Param("query") String query,
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
}
