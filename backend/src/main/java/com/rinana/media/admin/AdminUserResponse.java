package com.rinana.media.admin;

import com.rinana.media.common.MemberLevel;
import com.rinana.media.common.Role;
import com.rinana.media.common.UserStatus;
import com.rinana.media.user.UserEntity;

import java.util.UUID;

public record AdminUserResponse(
  UUID id,
  String username,
  String email,
  String displayName,
  Role role,
  MemberLevel memberLevel,
  UserStatus status
) {
  static AdminUserResponse from(UserEntity user) {
    return new AdminUserResponse(
      user.getId(),
      user.getUsername(),
      user.getEmail(),
      user.getDisplayName(),
      user.getRole(),
      user.getMemberLevel(),
      user.getStatus()
    );
  }
}
