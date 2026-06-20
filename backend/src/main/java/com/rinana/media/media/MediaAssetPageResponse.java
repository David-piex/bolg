package com.rinana.media.media;

import org.springframework.data.domain.Page;

import java.util.List;

public record MediaAssetPageResponse(
  List<MediaAssetResponse> items,
  int page,
  int size,
  long total,
  int totalPages
) {
  static MediaAssetPageResponse from(Page<MediaAssetResponse> page) {
    return new MediaAssetPageResponse(
      page.getContent(),
      page.getNumber(),
      page.getSize(),
      page.getTotalElements(),
      page.getTotalPages()
    );
  }
}
