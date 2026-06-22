package com.rinana.media.admin;

import java.time.Instant;
import java.util.UUID;

public record SiteSettingsResponse(
  String siteName,
  String logoText,
  String logoMark,
  UUID logoImageId,
  Instant updatedAt
) {
  static SiteSettingsResponse from(SiteSettingsEntity settings) {
    return new SiteSettingsResponse(
      settings.getSiteName(),
      settings.getLogoText(),
      settings.getLogoMark(),
      settings.getLogoImage() != null ? settings.getLogoImage().getId() : null,
      settings.getUpdatedAt()
    );
  }
}
