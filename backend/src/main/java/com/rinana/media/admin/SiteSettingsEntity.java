package com.rinana.media.admin;

import com.rinana.media.user.UserEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "site_settings")
public class SiteSettingsEntity {
  @Id
  private short id;

  @Column(name = "site_name", nullable = false, length = 120)
  private String siteName;

  @Column(name = "logo_text", nullable = false, length = 32)
  private String logoText;

  @Column(name = "logo_mark", nullable = false, length = 16)
  private String logoMark;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "updated_by")
  private UserEntity updatedBy;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public short getId() {
    return id;
  }

  public void setId(short id) {
    this.id = id;
  }

  public String getSiteName() {
    return siteName;
  }

  public void setSiteName(String siteName) {
    this.siteName = siteName;
  }

  public String getLogoText() {
    return logoText;
  }

  public void setLogoText(String logoText) {
    this.logoText = logoText;
  }

  public String getLogoMark() {
    return logoMark;
  }

  public void setLogoMark(String logoMark) {
    this.logoMark = logoMark;
  }

  public UserEntity getUpdatedBy() {
    return updatedBy;
  }

  public void setUpdatedBy(UserEntity updatedBy) {
    this.updatedBy = updatedBy;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }
}
