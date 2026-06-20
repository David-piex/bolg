package com.rinana.media.account;

import com.rinana.media.common.MemberLevel;
import com.rinana.media.common.Role;
import com.rinana.media.common.UserStatus;
import com.rinana.media.user.UserEntity;

import java.util.UUID;

public record AccountProfileResponse(
  UUID id,
  String username,
  String email,
  String displayName,
  Role role,
  MemberLevel memberLevel,
  UserStatus status,
  String avatarUrl
) {
  static AccountProfileResponse from(UserEntity user) {
    return new AccountProfileResponse(
      user.getId(),
      user.getUsername(),
      user.getEmail(),
      user.getDisplayName(),
      user.getRole(),
      user.getMemberLevel(),
      user.getStatus(),
      user.getAvatarUrl() == null || user.getAvatarUrl().isBlank() ? null : "/api/account/avatar"
    );
  }
}
