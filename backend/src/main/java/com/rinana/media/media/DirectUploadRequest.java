package com.rinana.media.media;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record DirectUploadRequest(
  @NotBlank String originalName,
  @NotBlank String mimeType,
  @Min(1) long sizeBytes,
  @NotNull MediaType mediaType
) {
}
