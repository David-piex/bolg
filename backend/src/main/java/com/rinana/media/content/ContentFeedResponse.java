package com.rinana.media.content;

import java.util.List;

public record ContentFeedResponse(
  List<PostResponse> posts,
  List<AlbumResponse> albums,
  List<VideoResponse> videos
) {
}
