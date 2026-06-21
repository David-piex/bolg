package com.rinana.media.content;

import com.rinana.media.common.ContentVisibility;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record VideoResponse(
  UUID id,
  String title,
  String description,
  String category,
  List<String> tags,
  ContentVisibility visibility,
  ContentStatus status,
  UUID mediaAssetId,
  UUID coverMediaId,
  Instant publishedAt,
  Instant scheduledAt
) {
  static VideoResponse from(VideoEntity video) {
    return new VideoResponse(
      video.getId(),
      video.getTitle(),
      video.getDescription(),
      video.getCategory(),
      ContentTaxonomy.parseTags(video.getTags()),
      video.getVisibility(),
      video.getStatus(),
      video.getMediaAsset().getId(),
      video.getCoverMedia() == null ? null : video.getCoverMedia().getId(),
      video.getPublishedAt(),
      video.getScheduledAt()
    );
  }
}
