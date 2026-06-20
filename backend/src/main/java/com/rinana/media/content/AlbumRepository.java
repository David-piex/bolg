package com.rinana.media.content;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AlbumRepository extends JpaRepository<AlbumEntity, UUID> {
  List<AlbumEntity> findByStatusOrderByPublishedAtDesc(ContentStatus status);

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
