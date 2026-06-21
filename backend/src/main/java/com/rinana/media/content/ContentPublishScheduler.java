package com.rinana.media.content;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class ContentPublishScheduler {
  private final AlbumRepository albumRepository;
  private final PostRepository postRepository;
  private final VideoRepository videoRepository;

  public ContentPublishScheduler(
    AlbumRepository albumRepository,
    PostRepository postRepository,
    VideoRepository videoRepository
  ) {
    this.albumRepository = albumRepository;
    this.postRepository = postRepository;
    this.videoRepository = videoRepository;
  }

  @Scheduled(fixedDelayString = "${rinana.content.scheduled-publish-delay-ms:60000}")
  @Transactional
  public void publishDueContent() {
    Instant now = Instant.now();
    publishPosts(now);
    publishAlbums(now);
    publishVideos(now);
  }

  private void publishPosts(Instant now) {
    for (PostEntity post : postRepository.findByStatusAndScheduledAtLessThanEqual(ContentStatus.SCHEDULED, now)) {
      post.setStatus(ContentStatus.PUBLISHED);
      post.setPublishedAt(post.getPublishedAt() == null ? now : post.getPublishedAt());
      post.setScheduledAt(null);
      post.setUpdatedAt(now);
      postRepository.save(post);
    }
  }

  private void publishAlbums(Instant now) {
    for (AlbumEntity album : albumRepository.findByStatusAndScheduledAtLessThanEqual(ContentStatus.SCHEDULED, now)) {
      album.setStatus(ContentStatus.PUBLISHED);
      album.setPublishedAt(album.getPublishedAt() == null ? now : album.getPublishedAt());
      album.setScheduledAt(null);
      album.setUpdatedAt(now);
      albumRepository.save(album);
    }
  }

  private void publishVideos(Instant now) {
    for (VideoEntity video : videoRepository.findByStatusAndScheduledAtLessThanEqual(ContentStatus.SCHEDULED, now)) {
      video.setStatus(ContentStatus.PUBLISHED);
      video.setPublishedAt(video.getPublishedAt() == null ? now : video.getPublishedAt());
      video.setScheduledAt(null);
      video.setUpdatedAt(now);
      videoRepository.save(video);
    }
  }
}
