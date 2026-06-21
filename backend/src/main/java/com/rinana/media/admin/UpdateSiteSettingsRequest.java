package com.rinana.media.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateSiteSettingsRequest(
  @NotBlank @Size(max = 120) String siteName,
  @NotBlank @Size(max = 32) String logoText,
  @NotBlank @Size(max = 16) String logoMark
) {
}
