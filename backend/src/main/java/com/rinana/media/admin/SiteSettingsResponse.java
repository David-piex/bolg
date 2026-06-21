package com.rinana.media.admin;

import java.time.Instant;

public record SiteSettingsResponse(
  String siteName,
  String logoText,
  String logoMark,
  Instant updatedAt
) {
  static SiteSettingsResponse from(SiteSettingsEntity settings) {
    return new SiteSettingsResponse(
      settings.getSiteName(),
      settings.getLogoText(),
      settings.getLogoMark(),
      settings.getUpdatedAt()
    );
  }
}
