package com.rinana.media.content;

import com.rinana.media.common.ContentVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record CreatePostRequest(
  @NotBlank @Size(max = 240) String title,
  @NotBlank String content,
  @NotNull ContentVisibility visibility,
  List<UUID> mediaAssetIds
) {
}
