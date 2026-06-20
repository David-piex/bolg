package com.rinana.media.admin;

import com.rinana.media.common.MemberLevel;
import com.rinana.media.invite.InviteCodeEntity;
import com.rinana.media.invite.InviteCodeStatus;

import java.util.UUID;

public record InviteResponse(
  UUID id,
  String code,
  MemberLevel initialLevel,
  int maxUses,
  int usedCount,
  InviteCodeStatus status
) {
  static InviteResponse from(InviteCodeEntity invite) {
    return new InviteResponse(
      invite.getId(),
      invite.getCode(),
      invite.getInitialLevel(),
      invite.getMaxUses(),
      invite.getUsedCount(),
      invite.getStatus()
    );
  }
}
