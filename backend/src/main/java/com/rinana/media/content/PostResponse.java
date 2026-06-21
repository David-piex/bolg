package com.rinana.media.content;

import com.rinana.media.common.ContentVisibility;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PostResponse(
  UUID id,
  String title,
  String content,
  ContentVisibility visibility,
  ContentStatus status,
  boolean pinned,
  Instant publishedAt,
  List<UUID> mediaAssetIds
) {
  static PostResponse from(PostEntity post) {
    return new PostResponse(
      post.getId(),
      post.getTitle(),
      post.getContent(),
      post.getVisibility(),
      post.getStatus(),
      post.isPinned(),
      post.getPublishedAt(),
      post.getMediaItems().stream()
        .map(item -> item.getMediaAsset().getId())
        .toList()
    );
  }
}
