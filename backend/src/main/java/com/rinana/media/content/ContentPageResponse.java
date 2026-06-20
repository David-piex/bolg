package com.rinana.media.content;

import org.springframework.data.domain.Page;

import java.util.List;

public record ContentPageResponse<T>(
  List<T> items,
  int page,
  int size,
  long total,
  int totalPages
) {
  static <T> ContentPageResponse<T> from(Page<T> page) {
    return new ContentPageResponse<>(
      page.getContent(),
      page.getNumber(),
      page.getSize(),
      page.getTotalElements(),
      page.getTotalPages()
    );
  }
}
