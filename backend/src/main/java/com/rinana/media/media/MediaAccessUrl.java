package com.rinana.media.media;

import java.net.URI;
import java.time.Instant;

public record MediaAccessUrl(
  URI url,
  Instant expiresAt
) {
}
