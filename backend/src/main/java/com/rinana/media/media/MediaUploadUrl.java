package com.rinana.media.media;

import java.net.URI;
import java.time.Instant;

public record MediaUploadUrl(
  URI url,
  String bucketName,
  String objectKey,
  Instant expiresAt
) {
}
