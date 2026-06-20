package com.rinana.media.content;

import com.rinana.media.common.ContentVisibility;

import java.time.Instant;
import java.util.UUID;

public record VideoResponse(
  UUID id,
  String title,
  String description,
  ContentVisibility visibility,
  UUID mediaAssetId,
  UUID coverMediaId,
  Instant publishedAt
) {
  static VideoResponse from(VideoEntity video) {
    return new VideoResponse(
      video.getId(),
      video.getTitle(),
      video.getDescription(),
      video.getVisibility(),
      video.getMediaAsset().getId(),
      video.getCoverMedia() == null ? null : video.getCoverMedia().getId(),
      video.getPublishedAt()
    );
  }
}
