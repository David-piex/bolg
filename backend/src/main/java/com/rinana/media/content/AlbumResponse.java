package com.rinana.media.content;

import com.rinana.media.common.ContentVisibility;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AlbumResponse(
  UUID id,
  String title,
  String description,
  String category,
  List<String> tags,
  ContentVisibility visibility,
  ContentStatus status,
  UUID coverMediaId,
  Instant publishedAt,
  Instant scheduledAt
) {
  static AlbumResponse from(AlbumEntity album) {
    return new AlbumResponse(
      album.getId(),
      album.getTitle(),
      album.getDescription(),
      album.getCategory(),
      ContentTaxonomy.parseTags(album.getTags()),
      album.getVisibility(),
      album.getStatus(),
      album.getCoverMedia() == null ? null : album.getCoverMedia().getId(),
      album.getPublishedAt(),
      album.getScheduledAt()
    );
  }
}
