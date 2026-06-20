package com.rinana.media.media;

import java.time.Instant;

public record MediaAccessResponse(
  String url,
  Instant expiresAt
) {
}
