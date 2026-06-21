package com.rinana.media.content;

import com.rinana.media.common.ContentVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record UpdateVideoRequest(
  @NotBlank String title,
  @NotBlank String description,
  @NotNull ContentVisibility visibility,
  ContentStatus status,
  UUID mediaAssetId,
  UUID coverMediaId
) {
}
