package com.rinana.media.admin;

import java.time.Instant;
import java.util.UUID;

public record AdminAuditLogResponse(
  UUID id,
  UUID adminUserId,
  String adminUsername,
  String adminDisplayName,
  String actionType,
  String targetType,
  UUID targetId,
  String detailJson,
  Instant createdAt
) {
}
