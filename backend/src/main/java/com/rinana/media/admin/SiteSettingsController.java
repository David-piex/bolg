package com.rinana.media.admin;

import com.rinana.media.auth.ApiException;
import com.rinana.media.auth.CurrentUserResolver;
import com.rinana.media.common.Role;
import com.rinana.media.media.MediaAssetEntity;
import com.rinana.media.media.MediaAssetRepository;
import com.rinana.media.user.UserEntity;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping("/api/admin/site-settings")
public class SiteSettingsController {
  private final CurrentUserResolver currentUserResolver;
  private final SiteSettingsRepository siteSettingsRepository;
  private final AdminAuditService adminAuditService;
  private final MediaAssetRepository mediaAssetRepository;

  public SiteSettingsController(
    CurrentUserResolver currentUserResolver,
    SiteSettingsRepository siteSettingsRepository,
    AdminAuditService adminAuditService,
    MediaAssetRepository mediaAssetRepository
  ) {
    this.currentUserResolver = currentUserResolver;
    this.siteSettingsRepository = siteSettingsRepository;
    this.adminAuditService = adminAuditService;
    this.mediaAssetRepository = mediaAssetRepository;
  }

  @GetMapping
  @Transactional(readOnly = true)
  SiteSettingsResponse getSiteSettings() {
    return SiteSettingsResponse.from(siteSettingsRepository.findById((short) 1).orElseGet(this::defaultSettings));
  }

  @PatchMapping
  @Transactional
  SiteSettingsResponse updateSiteSettings(
    @Valid @RequestBody UpdateSiteSettingsRequest request,
    HttpServletRequest servletRequest
  ) {
    UserEntity admin = requireAdmin(servletRequest);
    SiteSettingsEntity settings = loadOrCreate();
    settings.setSiteName(request.siteName().trim());
    settings.setLogoText(request.logoText().trim());
    settings.setLogoMark(request.logoMark().trim());

    if (request.logoImageId() != null) {
      MediaAssetEntity logoImage = mediaAssetRepository.findById(request.logoImageId())
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MEDIA_NOT_FOUND", "Logo image not found"));
      settings.setLogoImage(logoImage);
    } else {
      settings.setLogoImage(null);
    }

    settings.setUpdatedBy(admin);
    settings.setUpdatedAt(Instant.now());
    SiteSettingsEntity saved = siteSettingsRepository.save(settings);
    adminAuditService.record(
      admin,
      "UPDATE_SITE_SETTINGS",
      "SITE_SETTINGS",
      null,
      java.util.Map.of(
        "siteName", saved.getSiteName(),
        "logoText", saved.getLogoText(),
        "logoMark", saved.getLogoMark()
      )
    );
    return SiteSettingsResponse.from(saved);
  }

  private SiteSettingsEntity loadOrCreate() {
    return siteSettingsRepository.findById((short) 1).orElseGet(() -> siteSettingsRepository.save(defaultSettings()));
  }

  private SiteSettingsEntity defaultSettings() {
    SiteSettingsEntity settings = new SiteSettingsEntity();
    settings.setId((short) 1);
    settings.setSiteName("绫奈");
    settings.setLogoText("绫奈");
    settings.setLogoMark("绫");
    settings.setUpdatedAt(Instant.now());
    return settings;
  }

  private UserEntity requireAdmin(HttpServletRequest request) {
    UserEntity user = currentUserResolver.requireCurrentUser(request);
    if (user.getRole() != Role.ADMIN && user.getRole() != Role.SUPER_ADMIN) {
      throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_REQUIRED", "需要管理员权限");
    }
    return user;
  }
}
