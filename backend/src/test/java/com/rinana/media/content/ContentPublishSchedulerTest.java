package com.rinana.media.content;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContentPublishSchedulerTest {
  @Mock
  AlbumRepository albumRepository;

  @Mock
  ContentFeedCache contentFeedCache;

  @Mock
  PostRepository postRepository;

  @Mock
  VideoRepository videoRepository;

  @InjectMocks
  ContentPublishScheduler scheduler;

  @Test
  void publishesDueContentAcrossAllContentTypesAndEvictsFeedCache() {
    PostEntity post = scheduledPost();
    AlbumEntity album = scheduledAlbum();
    VideoEntity video = scheduledVideo();
    when(postRepository.findByStatusAndScheduledAtLessThanEqual(eq(ContentStatus.SCHEDULED), any(Instant.class)))
      .thenReturn(List.of(post));
    when(albumRepository.findByStatusAndScheduledAtLessThanEqual(eq(ContentStatus.SCHEDULED), any(Instant.class)))
      .thenReturn(List.of(album));
    when(videoRepository.findByStatusAndScheduledAtLessThanEqual(eq(ContentStatus.SCHEDULED), any(Instant.class)))
      .thenReturn(List.of(video));

    scheduler.publishDueContent();

    verify(postRepository).save(post);
    verify(albumRepository).save(album);
    verify(videoRepository).save(video);
    verify(contentFeedCache).evictAllAfterCommit();
  }

  @Test
  void leavesFeedCacheWhenNothingWasPublished() {
    when(postRepository.findByStatusAndScheduledAtLessThanEqual(eq(ContentStatus.SCHEDULED), any(Instant.class)))
      .thenReturn(List.of());
    when(albumRepository.findByStatusAndScheduledAtLessThanEqual(eq(ContentStatus.SCHEDULED), any(Instant.class)))
      .thenReturn(List.of());
    when(videoRepository.findByStatusAndScheduledAtLessThanEqual(eq(ContentStatus.SCHEDULED), any(Instant.class)))
      .thenReturn(List.of());

    scheduler.publishDueContent();

    verify(contentFeedCache, never()).evictAllAfterCommit();
  }

  private PostEntity scheduledPost() {
    PostEntity post = new PostEntity();
    post.setStatus(ContentStatus.SCHEDULED);
    post.setScheduledAt(Instant.parse("2026-01-01T00:00:00Z"));
    return post;
  }

  private AlbumEntity scheduledAlbum() {
    AlbumEntity album = new AlbumEntity();
    album.setStatus(ContentStatus.SCHEDULED);
    album.setScheduledAt(Instant.parse("2026-01-01T00:00:00Z"));
    return album;
  }

  private VideoEntity scheduledVideo() {
    VideoEntity video = new VideoEntity();
    video.setStatus(ContentStatus.SCHEDULED);
    video.setScheduledAt(Instant.parse("2026-01-01T00:00:00Z"));
    return video;
  }
}
