package com.rinana.media.auth;

import com.rinana.media.common.MemberLevel;
import com.rinana.media.common.Role;
import com.rinana.media.user.UserEntity;

import java.util.UUID;

public record AuthUserResponse(
  UUID id,
  String username,
  String email,
  String displayName,
  Role role,
  MemberLevel memberLevel
) {
  static AuthUserResponse from(UserEntity user) {
    return new AuthUserResponse(
      user.getId(),
      user.getUsername(),
      user.getEmail(),
      user.getDisplayName(),
      user.getRole(),
      user.getMemberLevel()
    );
  }
}
