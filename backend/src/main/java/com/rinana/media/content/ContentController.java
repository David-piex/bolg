package com.rinana.media.content;

import com.rinana.media.auth.ApiException;
import com.rinana.media.auth.CurrentUserResolver;
import com.rinana.media.common.ContentVisibility;
import com.rinana.media.common.MemberLevel;
import com.rinana.media.common.Role;
import com.rinana.media.media.MediaAssetEntity;
import com.rinana.media.media.MediaAssetRepository;
import com.rinana.media.security.VisibilityPolicy;
import com.rinana.media.user.UserEntity;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/content")
public class ContentController {
  private final CurrentUserResolver currentUserResolver;
  private final AlbumRepository albumRepository;
  private final MediaAssetRepository mediaAssetRepository;
  private final PostRepository postRepository;
  private final VideoRepository videoRepository;

  public ContentController(
    CurrentUserResolver currentUserResolver,
    AlbumRepository albumRepository,
    MediaAssetRepository mediaAssetRepository,
    PostRepository postRepository,
    VideoRepository videoRepository
  ) {
    this.currentUserResolver = currentUserResolver;
    this.albumRepository = albumRepository;
    this.mediaAssetRepository = mediaAssetRepository;
    this.postRepository = postRepository;
    this.videoRepository = videoRepository;
  }

  @GetMapping
  @Transactional(readOnly = true)
  ContentFeedResponse listContent(HttpServletRequest request) {
    UserEntity viewer = currentViewerOrVisitor(request);
    if (canManageContent(viewer)) {
      var posts = postRepository.findByStatusIn(List.of(ContentStatus.PUBLISHED, ContentStatus.DRAFT), postSort("latest")).stream()
        .map(PostResponse::from)
        .toList();
      var albums = albumRepository.findByStatusIn(List.of(ContentStatus.PUBLISHED, ContentStatus.DRAFT), contentSort("latest")).stream()
        .map(AlbumResponse::from)
        .toList();
      var videos = videoRepository.findByStatusIn(List.of(ContentStatus.PUBLISHED, ContentStatus.DRAFT), contentSort("latest")).stream()
        .map(VideoResponse::from)
        .toList();
      return new ContentFeedResponse(posts, albums, videos);
    }

    List<ContentVisibility> visibleLevels = visibleLevelsFor(viewer);

    var posts = postRepository.findByStatusAndVisibilityIn(ContentStatus.PUBLISHED, visibleLevels, postSort("latest")).stream()
      .map(PostResponse::from)
      .toList();
    var albums = albumRepository.findByStatusAndVisibilityInOrderByPublishedAtDesc(ContentStatus.PUBLISHED, visibleLevels).stream()
      .map(AlbumResponse::from)
      .toList();
    var videos = videoRepository.findByStatusAndVisibilityInOrderByPublishedAtDesc(ContentStatus.PUBLISHED, visibleLevels).stream()
      .map(VideoResponse::from)
      .toList();
    return new ContentFeedResponse(posts, albums, videos);
  }

  @GetMapping("/posts")
  @Transactional(readOnly = true)
  ContentPageResponse<PostResponse> listPosts(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "12") int size,
    @RequestParam(defaultValue = "") String q,
    @RequestParam(defaultValue = "latest") String sort,
    HttpServletRequest request
  ) {
    UserEntity viewer = currentViewerOrVisitor(request);
    var pageable = PageRequest.of(safePage(page), safeSize(size), postSort(sort));
    return ContentPageResponse.from(
      postRepository.searchPublished(ContentStatus.PUBLISHED, visibleLevelsFor(viewer), normalizedQuery(q), pageable)
        .map(PostResponse::from)
    );
  }

  @GetMapping("/posts/{id}")
  @Transactional(readOnly = true)
  PostResponse getPost(@PathVariable UUID id, HttpServletRequest request) {
    UserEntity viewer = currentViewerOrVisitor(request);
    return postRepository.findById(id)
      .filter(post -> post.getStatus() == ContentStatus.PUBLISHED)
      .filter(post -> visibleLevelsFor(viewer).contains(post.getVisibility()))
      .map(PostResponse::from)
      .orElseThrow(this::contentNotFound);
  }

  @GetMapping("/albums")
  @Transactional(readOnly = true)
  ContentPageResponse<AlbumResponse> listAlbums(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "12") int size,
    @RequestParam(defaultValue = "") String q,
    @RequestParam(defaultValue = "latest") String sort,
    HttpServletRequest request
  ) {
    UserEntity viewer = currentViewerOrVisitor(request);
    var pageable = PageRequest.of(safePage(page), safeSize(size), contentSort(sort));
    return ContentPageResponse.from(
      albumRepository.searchPublished(ContentStatus.PUBLISHED, visibleLevelsFor(viewer), normalizedQuery(q), pageable)
        .map(AlbumResponse::from)
    );
  }

  @GetMapping("/albums/{id}")
  @Transactional(readOnly = true)
  AlbumResponse getAlbum(@PathVariable UUID id, HttpServletRequest request) {
    UserEntity viewer = currentViewerOrVisitor(request);
    return albumRepository.findById(id)
      .filter(album -> album.getStatus() == ContentStatus.PUBLISHED)
      .filter(album -> visibleLevelsFor(viewer).contains(album.getVisibility()))
      .map(AlbumResponse::from)
      .orElseThrow(this::contentNotFound);
  }

  @GetMapping("/videos")
  @Transactional(readOnly = true)
  ContentPageResponse<VideoResponse> listVideos(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "12") int size,
    @RequestParam(defaultValue = "") String q,
    @RequestParam(defaultValue = "latest") String sort,
    HttpServletRequest request
  ) {
    UserEntity viewer = currentViewerOrVisitor(request);
    var pageable = PageRequest.of(safePage(page), safeSize(size), contentSort(sort));
    return ContentPageResponse.from(
      videoRepository.searchPublished(ContentStatus.PUBLISHED, visibleLevelsFor(viewer), normalizedQuery(q), pageable)
        .map(VideoResponse::from)
    );
  }

  @GetMapping("/videos/{id}")
  @Transactional(readOnly = true)
  VideoResponse getVideo(@PathVariable UUID id, HttpServletRequest request) {
    UserEntity viewer = currentViewerOrVisitor(request);
    return videoRepository.findById(id)
      .filter(video -> video.getStatus() == ContentStatus.PUBLISHED)
      .filter(video -> visibleLevelsFor(viewer).contains(video.getVisibility()))
      .map(VideoResponse::from)
      .orElseThrow(this::contentNotFound);
  }

  @PostMapping("/posts")
  @Transactional
  ResponseEntity<PostResponse> createPost(@Valid @RequestBody CreatePostRequest request, HttpServletRequest servletRequest) {
    UserEntity author = requireAdmin(servletRequest);
    Instant now = Instant.now();
    PostEntity post = new PostEntity();
    post.setTitle(request.title());
    post.setContent(request.content());
    post.setVisibility(request.visibility());
    post.setStatus(writeableStatus(request.status()));
    post.setPinned(Boolean.TRUE.equals(request.pinned()));
    post.setAuthor(author);
    if (post.getStatus() == ContentStatus.PUBLISHED) {
      post.setPublishedAt(now);
    }
    post.setCreatedAt(now);
    post.setUpdatedAt(now);
    replacePostMedia(post, request.mediaAssetIds());
    return ResponseEntity.status(HttpStatus.CREATED).body(PostResponse.from(postRepository.save(post)));
  }

  @PostMapping("/albums")
  @Transactional
  ResponseEntity<AlbumResponse> createAlbum(
    @Valid @RequestBody CreateAlbumRequest request,
    HttpServletRequest servletRequest
  ) {
    UserEntity author = requireAdmin(servletRequest);
    Instant now = Instant.now();
    AlbumEntity album = new AlbumEntity();
    album.setTitle(request.title());
    album.setDescription(request.description());
    album.setVisibility(request.visibility());
    album.setCoverMedia(request.coverMediaId() == null ? null : requireMedia(request.coverMediaId()));
    album.setStatus(writeableStatus(request.status()));
    album.setAuthor(author);
    if (album.getStatus() == ContentStatus.PUBLISHED) {
      album.setPublishedAt(now);
    }
    album.setCreatedAt(now);
    album.setUpdatedAt(now);
    return ResponseEntity.status(HttpStatus.CREATED).body(AlbumResponse.from(albumRepository.save(album)));
  }

  @PostMapping("/videos")
  @Transactional
  ResponseEntity<VideoResponse> createVideo(
    @Valid @RequestBody CreateVideoRequest request,
    HttpServletRequest servletRequest
  ) {
    UserEntity author = requireAdmin(servletRequest);
    Instant now = Instant.now();
    VideoEntity video = new VideoEntity();
    video.setTitle(request.title());
    video.setDescription(request.description());
    video.setVisibility(request.visibility());
    video.setMediaAsset(requireMedia(request.mediaAssetId()));
    video.setCoverMedia(request.coverMediaId() == null ? null : requireMedia(request.coverMediaId()));
    video.setStatus(writeableStatus(request.status()));
    video.setAuthor(author);
    if (video.getStatus() == ContentStatus.PUBLISHED) {
      video.setPublishedAt(now);
    }
    video.setCreatedAt(now);
    video.setUpdatedAt(now);
    return ResponseEntity.status(HttpStatus.CREATED).body(VideoResponse.from(videoRepository.save(video)));
  }

  @PatchMapping("/posts/{id}")
  @Transactional
  PostResponse updatePost(
    @PathVariable UUID id,
    @Valid @RequestBody UpdatePostRequest request,
    HttpServletRequest servletRequest
  ) {
    requireAdmin(servletRequest);
    PostEntity post = postRepository.findById(id)
      .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CONTENT_NOT_FOUND", "Content not found"));
    post.setTitle(request.title());
    post.setContent(request.content());
    post.setVisibility(request.visibility());
    applyStatus(post, request.status());
    if (request.pinned() != null) {
      post.setPinned(request.pinned());
    }
    replacePostMedia(post, request.mediaAssetIds());
    post.setUpdatedAt(Instant.now());
    return PostResponse.from(postRepository.save(post));
  }

  @PatchMapping("/albums/{id}")
  @Transactional
  AlbumResponse updateAlbum(
    @PathVariable UUID id,
    @Valid @RequestBody UpdateAlbumRequest request,
    HttpServletRequest servletRequest
  ) {
    requireAdmin(servletRequest);
    AlbumEntity album = albumRepository.findById(id)
      .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CONTENT_NOT_FOUND", "Content not found"));
    album.setTitle(request.title());
    album.setDescription(request.description());
    album.setVisibility(request.visibility());
    applyStatus(album, request.status());
    album.setCoverMedia(request.coverMediaId() == null ? null : requireMedia(request.coverMediaId()));
    album.setUpdatedAt(Instant.now());
    return AlbumResponse.from(albumRepository.save(album));
  }

  @PatchMapping("/videos/{id}")
  @Transactional
  VideoResponse updateVideo(
    @PathVariable UUID id,
    @Valid @RequestBody UpdateVideoRequest request,
    HttpServletRequest servletRequest
  ) {
    requireAdmin(servletRequest);
    VideoEntity video = videoRepository.findById(id)
      .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CONTENT_NOT_FOUND", "Content not found"));
    video.setTitle(request.title());
    video.setDescription(request.description());
    video.setVisibility(request.visibility());
    applyStatus(video, request.status());
    if (request.mediaAssetId() != null) {
      video.setMediaAsset(requireMedia(request.mediaAssetId()));
    }
    video.setCoverMedia(request.coverMediaId() == null ? null : requireMedia(request.coverMediaId()));
    video.setUpdatedAt(Instant.now());
    return VideoResponse.from(videoRepository.save(video));
  }

  @DeleteMapping("/posts/{id}")
  @Transactional
  ResponseEntity<Void> deletePost(@PathVariable UUID id, HttpServletRequest servletRequest) {
    requireAdmin(servletRequest);
    PostEntity post = postRepository.findById(id)
      .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CONTENT_NOT_FOUND", "Content not found"));
    post.setStatus(ContentStatus.DELETED);
    post.setUpdatedAt(Instant.now());
    postRepository.save(post);
    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/albums/{id}")
  @Transactional
  ResponseEntity<Void> deleteAlbum(@PathVariable UUID id, HttpServletRequest servletRequest) {
    requireAdmin(servletRequest);
    AlbumEntity album = albumRepository.findById(id)
      .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CONTENT_NOT_FOUND", "Content not found"));
    album.setStatus(ContentStatus.DELETED);
    album.setUpdatedAt(Instant.now());
    albumRepository.save(album);
    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/videos/{id}")
  @Transactional
  ResponseEntity<Void> deleteVideo(@PathVariable UUID id, HttpServletRequest servletRequest) {
    requireAdmin(servletRequest);
    VideoEntity video = videoRepository.findById(id)
      .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CONTENT_NOT_FOUND", "Content not found"));
    video.setStatus(ContentStatus.DELETED);
    video.setUpdatedAt(Instant.now());
    videoRepository.save(video);
    return ResponseEntity.noContent().build();
  }

  private List<ContentVisibility> visibleLevelsFor(UserEntity viewer) {
    Role role = viewer == null ? Role.USER : viewer.getRole();
    MemberLevel memberLevel = viewer == null ? MemberLevel.NORMAL : viewer.getMemberLevel();
    return Arrays.stream(ContentVisibility.values())
      .filter(visibility -> visibility == ContentVisibility.PUBLIC
        || viewer != null && VisibilityPolicy.canView(role, memberLevel, visibility))
      .toList();
  }

  private int safePage(int page) {
    return Math.max(page, 0);
  }

  private int safeSize(int size) {
    return Math.max(1, Math.min(size, 36));
  }

  private String normalizedQuery(String query) {
    return query == null ? "" : query.trim();
  }

  private Sort contentSort(String sort) {
    return switch (sort == null ? "latest" : sort.trim().toLowerCase()) {
      case "oldest" -> Sort.by(Sort.Direction.ASC, "publishedAt").and(Sort.by(Sort.Direction.ASC, "id"));
      case "title" -> Sort.by(Sort.Direction.ASC, "title").and(Sort.by(Sort.Direction.DESC, "publishedAt"));
      default -> Sort.by(Sort.Direction.DESC, "publishedAt").and(Sort.by(Sort.Direction.ASC, "id"));
    };
  }

  private Sort postSort(String sort) {
    Sort pinnedFirst = Sort.by(Sort.Direction.DESC, "pinned");
    return switch (sort == null ? "latest" : sort.trim().toLowerCase()) {
      case "oldest" -> pinnedFirst
        .and(Sort.by(Sort.Direction.ASC, "publishedAt"))
        .and(Sort.by(Sort.Direction.ASC, "id"));
      case "title" -> pinnedFirst
        .and(Sort.by(Sort.Direction.ASC, "title"))
        .and(Sort.by(Sort.Direction.DESC, "publishedAt"));
      default -> pinnedFirst
        .and(Sort.by(Sort.Direction.DESC, "publishedAt"))
        .and(Sort.by(Sort.Direction.ASC, "id"));
    };
  }

  private ApiException contentNotFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "CONTENT_NOT_FOUND", "Content not found");
  }

  private ContentStatus writeableStatus(ContentStatus status) {
    if (status == null) {
      return ContentStatus.PUBLISHED;
    }

    if (status == ContentStatus.DELETED) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CONTENT_STATUS", "Content status cannot be deleted here");
    }

    return status;
  }

  private void applyStatus(PostEntity post, ContentStatus status) {
    if (status == null) {
      return;
    }

    ContentStatus nextStatus = writeableStatus(status);
    if (post.getStatus() != ContentStatus.PUBLISHED && nextStatus == ContentStatus.PUBLISHED && post.getPublishedAt() == null) {
      post.setPublishedAt(Instant.now());
    }
    post.setStatus(nextStatus);
  }

  private void applyStatus(AlbumEntity album, ContentStatus status) {
    if (status == null) {
      return;
    }

    ContentStatus nextStatus = writeableStatus(status);
    if (album.getStatus() != ContentStatus.PUBLISHED && nextStatus == ContentStatus.PUBLISHED && album.getPublishedAt() == null) {
      album.setPublishedAt(Instant.now());
    }
    album.setStatus(nextStatus);
  }

  private void applyStatus(VideoEntity video, ContentStatus status) {
    if (status == null) {
      return;
    }

    ContentStatus nextStatus = writeableStatus(status);
    if (video.getStatus() != ContentStatus.PUBLISHED && nextStatus == ContentStatus.PUBLISHED && video.getPublishedAt() == null) {
      video.setPublishedAt(Instant.now());
    }
    video.setStatus(nextStatus);
  }

  private MediaAssetEntity requireMedia(java.util.UUID id) {
    return mediaAssetRepository.findById(id)
      .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MEDIA_NOT_FOUND", "媒体不存在"));
  }

  private void replacePostMedia(PostEntity post, List<UUID> mediaAssetIds) {
    post.getMediaItems().clear();
    if (mediaAssetIds == null || mediaAssetIds.isEmpty()) {
      return;
    }

    for (int index = 0; index < mediaAssetIds.size(); index += 1) {
      PostMediaEntity item = new PostMediaEntity();
      item.setPost(post);
      item.setMediaAsset(requireMedia(mediaAssetIds.get(index)));
      item.setSortOrder(index + 1);
      post.getMediaItems().add(item);
    }
  }

  private UserEntity currentViewerOrVisitor(HttpServletRequest request) {
    try {
      return currentUserResolver.requireCurrentUser(request);
    } catch (ApiException exception) {
      if (exception.getStatus() == HttpStatus.UNAUTHORIZED) {
        return null;
      }
      throw exception;
    }
  }

  private UserEntity requireAdmin(HttpServletRequest request) {
    UserEntity user = currentUserResolver.requireCurrentUser(request);
    if (user.getRole() != Role.ADMIN && user.getRole() != Role.SUPER_ADMIN) {
      throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_REQUIRED", "需要管理员权限");
    }
    return user;
  }

  private boolean canManageContent(UserEntity user) {
    return user != null && (user.getRole() == Role.ADMIN || user.getRole() == Role.SUPER_ADMIN);
  }
}
