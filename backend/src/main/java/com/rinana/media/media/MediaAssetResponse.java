package com.rinana.media.media;

import java.time.Instant;
import java.util.UUID;

public record MediaAssetResponse(
  UUID id,
  MediaType mediaType,
  String objectKey,
  String originalName,
  String mimeType,
  long sizeBytes,
  Instant createdAt
) {
  static MediaAssetResponse from(MediaAssetEntity asset) {
    return new MediaAssetResponse(
      asset.getId(),
      asset.getMediaType(),
      asset.getObjectKey(),
      asset.getOriginalName(),
      asset.getMimeType(),
      asset.getSizeBytes(),
      asset.getCreatedAt()
    );
  }
}
