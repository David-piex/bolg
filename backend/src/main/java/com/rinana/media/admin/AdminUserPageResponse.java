package com.rinana.media.admin;

import org.springframework.data.domain.Page;

import java.util.List;

public record AdminUserPageResponse(
  List<AdminUserResponse> users,
  int page,
  int size,
  long total,
  int totalPages
) {
  static AdminUserPageResponse from(Page<AdminUserResponse> page) {
    return new AdminUserPageResponse(
      page.getContent(),
      page.getNumber(),
      page.getSize(),
      page.getTotalElements(),
      page.getTotalPages()
    );
  }
}
