package com.rinana.media.media;

import com.rinana.media.auth.ApiException;
import com.rinana.media.auth.CurrentUserResolver;
import com.rinana.media.common.ContentVisibility;
import com.rinana.media.common.Role;
import com.rinana.media.content.AlbumRepository;
import com.rinana.media.content.ContentStatus;
import com.rinana.media.content.PostRepository;
import com.rinana.media.content.VideoRepository;
import com.rinana.media.security.VisibilityPolicy;
import com.rinana.media.user.UserEntity;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/media")
public class MediaController {
  private static final long IMAGE_MAX_BYTES = 10L * 1024 * 1024;
  private static final long VIDEO_MAX_BYTES = 95L * 1024 * 1024;

  private final CurrentUserResolver currentUserResolver;
  private final MediaStorageService mediaStorageService;
  private final MediaAssetRepository mediaAssetRepository;
  private final VideoRepository videoRepository;
  private final AlbumRepository albumRepository;
  private final PostRepository postRepository;

  public MediaController(
    CurrentUserResolver currentUserResolver,
    MediaStorageService mediaStorageService,
    MediaAssetRepository mediaAssetRepository,
    VideoRepository videoRepository,
    AlbumRepository albumRepository,
    PostRepository postRepository
  ) {
    this.currentUserResolver = currentUserResolver;
    this.mediaStorageService = mediaStorageService;
    this.mediaAssetRepository = mediaAssetRepository;
    this.videoRepository = videoRepository;
    this.albumRepository = albumRepository;
    this.postRepository = postRepository;
  }

  @PostMapping("/images")
  @Transactional
  ResponseEntity<MediaAssetResponse> uploadImage(@RequestParam("file") MultipartFile file, HttpServletRequest request) {
    requireAdmin(request);
    requireUploadAccepted(MediaType.IMAGE, file.getContentType(), file.getSize());
    return ResponseEntity.status(HttpStatus.CREATED).body(MediaAssetResponse.from(store(file, MediaType.IMAGE, "images", request)));
  }

  @PostMapping("/videos")
  @Transactional
  ResponseEntity<MediaAssetResponse> uploadVideo(@RequestParam("file") MultipartFile file, HttpServletRequest request) {
    requireAdmin(request);
    requireUploadAccepted(MediaType.VIDEO, file.getContentType(), file.getSize());
    return ResponseEntity.status(HttpStatus.CREATED).body(MediaAssetResponse.from(store(file, MediaType.VIDEO, "videos", request)));
  }

  @PostMapping("/direct-uploads")
  ResponseEntity<DirectUploadResponse> createDirectUpload(
    @Valid @RequestBody DirectUploadRequest uploadRequest,
    HttpServletRequest request
  ) {
    requireAdmin(request);
    requireUploadAccepted(uploadRequest.mediaType(), uploadRequest.mimeType(), uploadRequest.sizeBytes());
    MediaUploadUrl uploadUrl = mediaStorageService.createUploadUrl(
      uploadRequest.mediaType(),
      objectPrefixFor(uploadRequest.mediaType()),
      uploadRequest.originalName(),
      uploadRequest.mimeType()
    );
    return ResponseEntity.status(HttpStatus.CREATED).body(
      DirectUploadResponse.from(uploadUrl, uploadRequest.mediaType(), uploadRequest.mimeType())
    );
  }

  @PostMapping("/direct-uploads/complete")
  @Transactional
  ResponseEntity<MediaAssetResponse> completeDirectUpload(
    @Valid @RequestBody CompleteDirectUploadRequest uploadRequest,
    HttpServletRequest request
  ) {
    UserEntity uploader = requireAdmin(request);
    requireUploadAccepted(uploadRequest.mediaType(), uploadRequest.mimeType(), uploadRequest.sizeBytes());
    requireManagedBucket(uploadRequest.bucketName());
    requireObjectKeyMatchesMediaType(uploadRequest.mediaType(), uploadRequest.objectKey());

    if (!mediaStorageService.objectExists(uploadRequest.bucketName(), uploadRequest.objectKey(), uploadRequest.sizeBytes())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "MEDIA_UPLOAD_NOT_FOUND", "媒体文件尚未上传完成");
    }

    MediaAssetEntity asset = new MediaAssetEntity();
    asset.setMediaType(uploadRequest.mediaType());
    asset.setBucketName(uploadRequest.bucketName());
    asset.setObjectKey(uploadRequest.objectKey());
    asset.setOriginalName(uploadRequest.originalName());
    asset.setMimeType(uploadRequest.mimeType());
    asset.setSizeBytes(uploadRequest.sizeBytes());
    asset.setUploadedBy(uploader);
    asset.setCreatedAt(Instant.now());

    return ResponseEntity.status(HttpStatus.CREATED).body(MediaAssetResponse.from(mediaAssetRepository.save(asset)));
  }

  @GetMapping
  MediaAssetPageResponse listMedia(
    @RequestParam(required = false) MediaType mediaType,
    @RequestParam(required = false) String q,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "18") int size,
    HttpServletRequest request
  ) {
    requireAdmin(request);
    int safePage = Math.max(page, 0);
    int safeSize = Math.max(1, Math.min(size, 50));
    String query = q == null || q.isBlank() ? null : q.trim();
    var pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
    return MediaAssetPageResponse.from(
      mediaAssetRepository.findLibraryAssets(mediaType, query, pageable).map(MediaAssetResponse::from)
    );
  }

  @GetMapping("/{id}/access")
  MediaAccessResponse access(@PathVariable UUID id, HttpServletRequest request) {
    UserEntity viewer = currentUserResolver.currentUser(request).orElse(null);
    MediaAssetEntity asset = mediaAssetRepository.findById(id)
      .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MEDIA_NOT_FOUND", "媒体不存在"));
    requireLinkedContentVisible(asset, viewer);
    MediaAccessUrl accessUrl = mediaStorageService.createAccessUrl(asset.getBucketName(), asset.getObjectKey());
    return new MediaAccessResponse(accessUrl.url().toString(), accessUrl.expiresAt());
  }

  @GetMapping("/{id}/view")
  ResponseEntity<Void> view(@PathVariable UUID id, HttpServletRequest request) {
    UserEntity viewer = currentUserResolver.currentUser(request).orElse(null);
    MediaAssetEntity asset = mediaAssetRepository.findById(id)
      .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MEDIA_NOT_FOUND", "媒体不存在"));
    requireLinkedContentVisible(asset, viewer);
    MediaAccessUrl accessUrl = mediaStorageService.createAccessUrl(asset.getBucketName(), asset.getObjectKey());
    return ResponseEntity.status(HttpStatus.FOUND)
      .header(HttpHeaders.LOCATION, accessUrl.url().toString())
      .build();
  }

  private MediaAssetEntity store(MultipartFile file, MediaType mediaType, String objectPrefix, HttpServletRequest request) {
    UserEntity uploader = requireAdmin(request);
    StoredMediaObject stored = mediaStorageService.store(file, mediaType, objectPrefix);
    MediaAssetEntity asset = new MediaAssetEntity();
    asset.setMediaType(mediaType);
    asset.setBucketName(stored.bucketName());
    asset.setObjectKey(stored.objectKey());
    asset.setOriginalName(file.getOriginalFilename() == null ? "upload" : file.getOriginalFilename());
    asset.setMimeType(file.getContentType() == null ? "application/octet-stream" : file.getContentType());
    asset.setSizeBytes(file.getSize());
    asset.setUploadedBy(uploader);
    asset.setCreatedAt(Instant.now());
    return mediaAssetRepository.save(asset);
  }

  private UserEntity requireAdmin(HttpServletRequest request) {
    UserEntity user = currentUserResolver.requireCurrentUser(request);
    if (user.getRole() != Role.ADMIN && user.getRole() != Role.SUPER_ADMIN) {
      throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_REQUIRED", "需要管理员权限");
    }
    return user;
  }

  private void requireLinkedContentVisible(MediaAssetEntity asset, UserEntity viewer) {
    if (viewer != null && (viewer.getRole() == Role.ADMIN || viewer.getRole() == Role.SUPER_ADMIN)) {
      return;
    }

    boolean linkedToPublishedContent = false;

    var linkedVideo = videoRepository.findPublishedByMediaAssetId(asset.getId(), ContentStatus.PUBLISHED);
    if (linkedVideo.isPresent()) {
      linkedToPublishedContent = true;
      if (viewerCanSee(viewer, linkedVideo.get().getVisibility())) {
        return;
      }
    }

    var linkedAlbum = albumRepository.findPublishedByCoverMediaId(asset.getId(), ContentStatus.PUBLISHED);
    if (linkedAlbum.isPresent()) {
      linkedToPublishedContent = true;
      if (viewerCanSee(viewer, linkedAlbum.get().getVisibility())) {
        return;
      }
    }

    var linkedPost = postRepository.findPublishedByMediaAssetId(asset.getId(), ContentStatus.PUBLISHED);
    if (linkedPost.isPresent()) {
      linkedToPublishedContent = true;
      if (viewerCanSee(viewer, linkedPost.get().getVisibility())) {
        return;
      }
    }

    if (!linkedToPublishedContent || viewer == null) {
      throw new ApiException(HttpStatus.FORBIDDEN, "CONTENT_NOT_VISIBLE", "内容对当前账号不可见");
    }

    throw new ApiException(HttpStatus.FORBIDDEN, "CONTENT_NOT_VISIBLE", "内容对当前账号不可见");
  }

  private boolean viewerCanSee(UserEntity viewer, ContentVisibility visibility) {
    if (visibility == ContentVisibility.PUBLIC) {
      return true;
    }
    return viewer != null && VisibilityPolicy.canView(viewer.getRole(), viewer.getMemberLevel(), visibility);
  }

  private void requireUploadAccepted(MediaType mediaType, String contentType, long sizeBytes) {
    requireMimePrefix(contentType, mediaType == MediaType.IMAGE ? "image/" : "video/");
    long maxBytes = mediaType == MediaType.IMAGE ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES;
    if (sizeBytes <= 0 || sizeBytes > maxBytes) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "MEDIA_TOO_LARGE", "媒体文件大小不符合限制");
    }
  }

  private void requireMimePrefix(String contentType, String prefix) {
    if (contentType == null || !contentType.startsWith(prefix)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_MEDIA_TYPE", "媒体类型不支持");
    }
  }

  private String objectPrefixFor(MediaType mediaType) {
    return mediaType == MediaType.IMAGE ? "images" : "videos";
  }

  private void requireObjectKeyMatchesMediaType(MediaType mediaType, String objectKey) {
    String expectedPrefix = objectPrefixFor(mediaType) + "/";
    if (!objectKey.startsWith(expectedPrefix)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_MEDIA_OBJECT", "媒体对象路径不符合类型");
    }
  }

  private void requireManagedBucket(String bucketName) {
    if (!mediaStorageService.bucketName().equals(bucketName)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_MEDIA_BUCKET", "媒体存储桶不符合配置");
    }
  }
}
