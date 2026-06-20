package com.rinana.media.media;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface MediaAssetRepository extends JpaRepository<MediaAssetEntity, UUID> {
  @Query("""
    select asset from MediaAssetEntity asset
    where (:mediaType is null or asset.mediaType = :mediaType)
      and (
        :query is null
        or lower(asset.originalName) like lower(concat('%', :query, '%'))
        or lower(asset.objectKey) like lower(concat('%', :query, '%'))
      )
    """)
  Page<MediaAssetEntity> findLibraryAssets(
    @Param("mediaType") MediaType mediaType,
    @Param("query") String query,
    Pageable pageable
  );
}
