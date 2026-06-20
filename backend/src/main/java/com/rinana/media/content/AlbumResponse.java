package com.rinana.media.content;

import com.rinana.media.common.ContentVisibility;

import java.time.Instant;
import java.util.UUID;

public record AlbumResponse(
  UUID id,
  String title,
  String description,
  ContentVisibility visibility,
  UUID coverMediaId,
  Instant publishedAt
) {
  static AlbumResponse from(AlbumEntity album) {
    return new AlbumResponse(
      album.getId(),
      album.getTitle(),
      album.getDescription(),
      album.getVisibility(),
      album.getCoverMedia() == null ? null : album.getCoverMedia().getId(),
      album.getPublishedAt()
    );
  }
}
