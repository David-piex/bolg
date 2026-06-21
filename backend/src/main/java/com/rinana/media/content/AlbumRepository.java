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

public interface AlbumRepository extends JpaRepository<AlbumEntity, UUID> {
  List<AlbumEntity> findByStatusOrderByPublishedAtDesc(ContentStatus status);

  List<AlbumEntity> findByStatusAndVisibilityInOrderByPublishedAtDesc(
    ContentStatus status,
    Collection<ContentVisibility> visibilities
  );

  Page<AlbumEntity> findByStatusAndVisibilityIn(
    ContentStatus status,
    Collection<ContentVisibility> visibilities,
    Pageable pageable
  );

  @Query("""
    select album from AlbumEntity album
    where album.status = :status
      and album.visibility in :visibilities
      and (
        :query = ''
        or lower(album.title) like lower(concat('%', :query, '%'))
        or lower(album.description) like lower(concat('%', :query, '%'))
      )
    """)
  Page<AlbumEntity> searchPublished(
    @Param("status") ContentStatus status,
    @Param("visibilities") Collection<ContentVisibility> visibilities,
    @Param("query") String query,
    Pageable pageable
  );

  @Query("""
    select album from AlbumEntity album
    where album.status = :status
      and album.coverMedia.id = :mediaAssetId
    """)
  Optional<AlbumEntity> findPublishedByCoverMediaId(
    @Param("mediaAssetId") UUID mediaAssetId,
    @Param("status") ContentStatus status
  );
}
