package com.rinana.media.admin;

import java.util.List;

public record AdminAuditLogPageResponse(
  List<AdminAuditLogResponse> items,
  int page,
  int size,
  long total,
  int totalPages
) {
  static AdminAuditLogPageResponse of(List<AdminAuditLogResponse> items, int page, int size, long total) {
    int totalPages = (int) Math.ceil((double) total / size);
    return new AdminAuditLogPageResponse(items, page, size, total, totalPages);
  }
}
