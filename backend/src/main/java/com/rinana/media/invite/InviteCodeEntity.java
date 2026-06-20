package com.rinana.media.invite;

import com.rinana.media.common.MemberLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "invite_codes")
public class InviteCodeEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false, unique = true, length = 64)
  private String code;

  @Enumerated(EnumType.STRING)
  @Column(name = "initial_level", nullable = false, length = 32)
  private MemberLevel initialLevel;

  @Column(name = "max_uses", nullable = false)
  private int maxUses;

  @Column(name = "used_count", nullable = false)
  private int usedCount;

  @Column(name = "expires_at")
  private Instant expiresAt;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private InviteCodeStatus status;

  @Column(name = "created_by")
  private UUID createdBy;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public String getCode() {
    return code;
  }

  public void setCode(String code) {
    this.code = code;
  }

  public MemberLevel getInitialLevel() {
    return initialLevel;
  }

  public void setInitialLevel(MemberLevel initialLevel) {
    this.initialLevel = initialLevel;
  }

  public int getMaxUses() {
    return maxUses;
  }

  public void setMaxUses(int maxUses) {
    this.maxUses = maxUses;
  }

  public int getUsedCount() {
    return usedCount;
  }

  public void setUsedCount(int usedCount) {
    this.usedCount = usedCount;
  }

  public Instant getExpiresAt() {
    return expiresAt;
  }

  public void setExpiresAt(Instant expiresAt) {
    this.expiresAt = expiresAt;
  }

  public InviteCodeStatus getStatus() {
    return status;
  }

  public void setStatus(InviteCodeStatus status) {
    this.status = status;
  }

  public UUID getCreatedBy() {
    return createdBy;
  }

  public void setCreatedBy(UUID createdBy) {
    this.createdBy = createdBy;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }
}
