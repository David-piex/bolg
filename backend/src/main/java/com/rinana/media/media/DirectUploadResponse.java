package com.rinana.media.media;

import java.time.Instant;

public record DirectUploadResponse(
  String uploadUrl,
  String bucketName,
  String objectKey,
  MediaType mediaType,
  String mimeType,
  Instant expiresAt
) {
  static DirectUploadResponse from(MediaUploadUrl uploadUrl, MediaType mediaType, String mimeType) {
    return new DirectUploadResponse(
      uploadUrl.url().toString(),
      uploadUrl.bucketName(),
      uploadUrl.objectKey(),
      mediaType,
      mimeType,
      uploadUrl.expiresAt()
    );
  }
}
