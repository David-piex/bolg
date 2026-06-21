package com.rinana.media.content;

import com.rinana.media.common.ContentVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UpdateAlbumRequest(
  @NotBlank @Size(max = 240) String title,
  @NotBlank String description,
  @Size(max = 80) String category,
  List<String> tags,
  @NotNull ContentVisibility visibility,
  ContentStatus status,
  Instant scheduledAt,
  UUID coverMediaId
) {
}
