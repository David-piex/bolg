package com.rinana.media.media;

import com.rinana.media.common.MemberLevel;
import com.rinana.media.common.Role;
import com.rinana.media.common.UserStatus;
import com.rinana.media.common.ContentVisibility;
import com.rinana.media.content.AlbumEntity;
import com.rinana.media.content.AlbumRepository;
import com.rinana.media.content.ContentStatus;
import com.rinana.media.content.VideoEntity;
import com.rinana.media.content.VideoRepository;
import com.rinana.media.user.UserEntity;
import com.rinana.media.user.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.net.URI;
import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class MediaControllerTest {
  @Autowired
  MockMvc mvc;

  @Autowired
  MediaAssetRepository mediaAssetRepository;

  @Autowired
  UserRepository userRepository;

  @Autowired
  PasswordEncoder passwordEncoder;

  @Autowired
  VideoRepository videoRepository;

  @Autowired
  AlbumRepository albumRepository;

  @MockBean
  MediaStorageService mediaStorageService;

  @MockBean
  StringRedisTemplate redisTemplate;

  @MockBean
  ValueOperations<String, String> valueOperations;

  @BeforeEach
  void setUpRedisMocks() {
    when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    when(mediaStorageService.bucketName()).thenReturn("rinana-media");
  }

  @Test
  void adminCanUploadImageAndGetAccessUrl() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");
    given(mediaStorageService.store(any(), any(), any())).willReturn(
      new StoredMediaObject("rinana-media", "images/test-image.png")
    );
    given(mediaStorageService.createAccessUrl("rinana-media", "images/test-image.png")).willReturn(
      new MediaAccessUrl(URI.create("http://minio.local/images/test-image.png"), Instant.parse("2026-01-01T00:15:00Z"))
    );

    MockMultipartFile image = new MockMultipartFile(
      "file",
      "test-image.png",
      "image/png",
      new byte[] {1, 2, 3}
    );

    String body = mvc.perform(multipart("/api/media/images").file(image).cookie(adminCookie))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.mediaType").value("IMAGE"))
      .andExpect(jsonPath("$.originalName").value("test-image.png"))
      .andReturn()
      .getResponse()
      .getContentAsString();

    String mediaId = body.replaceAll("(?s).*\"id\":\"([^\"]+)\".*", "$1");
    assertThat(mediaAssetRepository.findById(java.util.UUID.fromString(mediaId))).isPresent();

    mvc.perform(get("/api/media/" + mediaId + "/access").cookie(adminCookie))
      .andExpect(status().isOk())
      .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string("Cache-Control", "private, max-age=300"))
      .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string("Vary", "Cookie, Authorization"))
      .andExpect(jsonPath("$.url").value("http://minio.local/images/test-image.png"))
      .andExpect(jsonPath("$.expiresAt").value("2026-01-01T00:15:00Z"));

    mvc.perform(get("/api/media/" + mediaId + "/view").cookie(adminCookie))
      .andExpect(status().isFound())
      .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string("Cache-Control", "private, max-age=300"))
      .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string("Vary", "Cookie, Authorization"))
      .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string("Location", "http://minio.local/images/test-image.png"));
  }

  @Test
  void adminCanUploadVideo() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");
    given(mediaStorageService.store(any(), any(), any())).willReturn(
      new StoredMediaObject("rinana-media", "videos/test-video.mp4")
    );

    MockMultipartFile video = new MockMultipartFile(
      "file",
      "test-video.mp4",
      "video/mp4",
      new byte[] {1, 2, 3}
    );

    mvc.perform(multipart("/api/media/videos").file(video).cookie(adminCookie))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.mediaType").value("VIDEO"))
      .andExpect(jsonPath("$.objectKey").value("videos/test-video.mp4"));
  }

  @Test
  void adminCanListSearchAndFilterMediaAssets() throws Exception {
    UserEntity admin = userRepository.findByUsername("admin").orElseThrow();
    createMediaAsset(admin, "images/library-unique-cover.jpg", com.rinana.media.media.MediaType.IMAGE);
    createMediaAsset(admin, "videos/search-trailer.mp4", com.rinana.media.media.MediaType.VIDEO);
    Cookie adminCookie = login("admin", "admin123456");

    mvc.perform(get("/api/media")
        .cookie(adminCookie)
        .param("mediaType", "IMAGE")
        .param("q", "library-unique")
        .param("page", "0")
        .param("size", "10"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items.length()").value(1))
      .andExpect(jsonPath("$.items[0].mediaType").value("IMAGE"))
      .andExpect(jsonPath("$.items[0].originalName").value("images/library-unique-cover.jpg"))
      .andExpect(jsonPath("$.page").value(0))
      .andExpect(jsonPath("$.size").value(10))
      .andExpect(jsonPath("$.total").value(1));
  }

  @Test
  void normalUserCannotListMediaAssets() throws Exception {
    Cookie userCookie = loginUser("normal-media-lister");

    mvc.perform(get("/api/media").cookie(userCookie))
      .andExpect(status().isForbidden())
      .andExpect(jsonPath("$.errorCode").value("ADMIN_REQUIRED"));
  }

  @Test
  void adminCanCreateAndCompleteDirectImageUpload() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");
    UserEntity admin = userRepository.findByUsername("admin").orElseThrow();
    String objectPrefix = "images/" + admin.getId();
    String objectKey = objectPrefix + "/direct-cover.webp";
    given(mediaStorageService.createUploadUrl(com.rinana.media.media.MediaType.IMAGE, objectPrefix, "cover.webp", "image/webp")).willReturn(
      new MediaUploadUrl(
        URI.create("http://minio.local/rinana-media/" + objectKey + "?X-Amz-Signature=test"),
        "rinana-media",
        objectKey,
        Instant.parse("2026-01-01T00:10:00Z")
      )
    );
    given(mediaStorageService.objectExists("rinana-media", objectKey, 12)).willReturn(true);

    mvc.perform(post("/api/media/direct-uploads")
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(Map.of(
          "originalName", "cover.webp",
          "mimeType", "image/webp",
          "sizeBytes", 12,
          "mediaType", "IMAGE"
        ))))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.uploadUrl").value("http://minio.local/rinana-media/" + objectKey + "?X-Amz-Signature=test"))
      .andExpect(jsonPath("$.bucketName").value("rinana-media"))
      .andExpect(jsonPath("$.objectKey").value(objectKey))
      .andExpect(jsonPath("$.mediaType").value("IMAGE"));

    String body = mvc.perform(post("/api/media/direct-uploads/complete")
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(Map.of(
          "bucketName", "rinana-media",
          "objectKey", objectKey,
          "originalName", "cover.webp",
          "mimeType", "image/webp",
          "sizeBytes", 12,
          "mediaType", "IMAGE"
        ))))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.mediaType").value("IMAGE"))
      .andExpect(jsonPath("$.objectKey").value(objectKey))
      .andExpect(jsonPath("$.originalName").value("cover.webp"))
      .andReturn()
      .getResponse()
      .getContentAsString();

    String mediaId = body.replaceAll("(?s).*\"id\":\"([^\"]+)\".*", "$1");
    assertThat(mediaAssetRepository.findById(java.util.UUID.fromString(mediaId))).isPresent();
  }

  @Test
  void normalUserCannotCreateDirectUpload() throws Exception {
    Cookie userCookie = loginUser("normal-direct-uploader");

    mvc.perform(post("/api/media/direct-uploads")
        .cookie(userCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(Map.of(
          "originalName", "cover.webp",
          "mimeType", "image/webp",
          "sizeBytes", 12,
          "mediaType", "IMAGE"
        ))))
      .andExpect(status().isForbidden())
      .andExpect(jsonPath("$.errorCode").value("ADMIN_REQUIRED"));
  }

  @Test
  void directUploadCompleteRejectsMissingObject() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");
    UserEntity admin = userRepository.findByUsername("admin").orElseThrow();
    String objectKey = "videos/" + admin.getId() + "/missing.mp4";
    given(mediaStorageService.objectExists("rinana-media", objectKey, 12)).willReturn(false);

    mvc.perform(post("/api/media/direct-uploads/complete")
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(Map.of(
          "bucketName", "rinana-media",
          "objectKey", objectKey,
          "originalName", "missing.mp4",
          "mimeType", "video/mp4",
          "sizeBytes", 12,
          "mediaType", "VIDEO"
        ))))
      .andExpect(status().isBadRequest())
      .andExpect(jsonPath("$.errorCode").value("MEDIA_UPLOAD_NOT_FOUND"));
  }

  @Test
  void directUploadCompleteRejectsUnexpectedBucket() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");

    mvc.perform(post("/api/media/direct-uploads/complete")
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(Map.of(
          "bucketName", "other-bucket",
          "objectKey", "images/direct-cover.webp",
          "originalName", "cover.webp",
          "mimeType", "image/webp",
          "sizeBytes", 12,
          "mediaType", "IMAGE"
        ))))
      .andExpect(status().isBadRequest())
      .andExpect(jsonPath("$.errorCode").value("INVALID_MEDIA_BUCKET"));
  }

  @Test
  void directUploadCompleteRejectsObjectKeysOwnedByAnotherUser() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");
    String otherUserObjectKey = "images/" + java.util.UUID.randomUUID() + "/direct-cover.webp";

    mvc.perform(post("/api/media/direct-uploads/complete")
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(Map.of(
          "bucketName", "rinana-media",
          "objectKey", otherUserObjectKey,
          "originalName", "cover.webp",
          "mimeType", "image/webp",
          "sizeBytes", 12,
          "mediaType", "IMAGE"
        ))))
      .andExpect(status().isForbidden())
      .andExpect(jsonPath("$.errorCode").value("MEDIA_UPLOAD_OWNER_MISMATCH"));
  }

  @Test
  void normalUserCannotUploadMedia() throws Exception {
    Cookie userCookie = loginUser("normal-uploader");
    MockMultipartFile image = new MockMultipartFile("file", "test.png", "image/png", new byte[] {1});

    mvc.perform(multipart("/api/media/images").file(image).cookie(userCookie))
      .andExpect(status().isForbidden())
      .andExpect(jsonPath("$.errorCode").value("ADMIN_REQUIRED"));
  }

  @Test
  void videoUploadRejectsNonVideoMimeTypes() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");
    MockMultipartFile image = new MockMultipartFile("file", "not-video.png", "image/png", new byte[] {1});

    mvc.perform(multipart("/api/media/videos").file(image).cookie(adminCookie))
      .andExpect(status().isBadRequest())
      .andExpect(jsonPath("$.errorCode").value("INVALID_MEDIA_TYPE"));
  }

  @Test
  void imageUploadRejectsSvgMimeType() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");
    MockMultipartFile svg = new MockMultipartFile("file", "xss.svg", "image/svg+xml", new byte[] {1});

    mvc.perform(multipart("/api/media/images").file(svg).cookie(adminCookie))
      .andExpect(status().isBadRequest())
      .andExpect(jsonPath("$.errorCode").value("INVALID_MEDIA_TYPE"));
  }

  @Test
  void mediaAccessUsesLinkedVideoVisibility() throws Exception {
    UserEntity admin = userRepository.findByUsername("admin").orElseThrow();
    MediaAssetEntity videoAsset = createMediaAsset(admin, "videos/diamond-only.mp4", com.rinana.media.media.MediaType.VIDEO);
    createPublishedVideo(admin, videoAsset, ContentVisibility.DIAMOND);
    given(mediaStorageService.createAccessUrl("rinana-media", "videos/diamond-only.mp4")).willReturn(
      new MediaAccessUrl(URI.create("http://minio.local/videos/diamond-only.mp4"), Instant.parse("2026-01-01T00:15:00Z"))
    );

    Cookie normalCookie = loginUser("normal-media-reader", MemberLevel.NORMAL);
    mvc.perform(get("/api/media/" + videoAsset.getId() + "/access").cookie(normalCookie))
      .andExpect(status().isForbidden())
      .andExpect(jsonPath("$.errorCode").value("CONTENT_NOT_VISIBLE"));

    Cookie diamondCookie = loginUser("diamond-media-reader", MemberLevel.DIAMOND);
    mvc.perform(get("/api/media/" + videoAsset.getId() + "/access").cookie(diamondCookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.url").value("http://minio.local/videos/diamond-only.mp4"));
  }

  @Test
  void mediaAccessUsesLinkedAlbumCoverVisibility() throws Exception {
    UserEntity admin = userRepository.findByUsername("admin").orElseThrow();
    MediaAssetEntity coverAsset = createMediaAsset(admin, "images/diamond-album.jpg", com.rinana.media.media.MediaType.IMAGE);
    createPublishedAlbum(admin, coverAsset, ContentVisibility.DIAMOND);
    given(mediaStorageService.createAccessUrl("rinana-media", "images/diamond-album.jpg")).willReturn(
      new MediaAccessUrl(URI.create("http://minio.local/images/diamond-album.jpg"), Instant.parse("2026-01-01T00:15:00Z"))
    );

    Cookie normalCookie = loginUser("normal-album-reader", MemberLevel.NORMAL);
    mvc.perform(get("/api/media/" + coverAsset.getId() + "/access").cookie(normalCookie))
      .andExpect(status().isForbidden())
      .andExpect(jsonPath("$.errorCode").value("CONTENT_NOT_VISIBLE"));

    Cookie diamondCookie = loginUser("diamond-album-reader", MemberLevel.DIAMOND);
    mvc.perform(get("/api/media/" + coverAsset.getId() + "/access").cookie(diamondCookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.url").value("http://minio.local/images/diamond-album.jpg"));
  }

  @Test
  void mediaAccessUsesLinkedPostImageVisibility() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");
    UserEntity admin = userRepository.findByUsername("admin").orElseThrow();
    MediaAssetEntity imageAsset = createMediaAsset(admin, "images/gold-post.jpg", com.rinana.media.media.MediaType.IMAGE);
    given(mediaStorageService.createAccessUrl("rinana-media", "images/gold-post.jpg")).willReturn(
      new MediaAccessUrl(URI.create("http://minio.local/images/gold-post.jpg"), Instant.parse("2026-01-01T00:15:00Z"))
    );

    mvc.perform(post("/api/content/posts")
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(Map.of(
          "title", "gold image post",
          "content", "body",
          "visibility", "GOLD",
          "mediaAssetIds", java.util.List.of(imageAsset.getId().toString())
        ))))
      .andExpect(status().isCreated());

    mvc.perform(get("/api/media/" + imageAsset.getId() + "/access"))
      .andExpect(status().isForbidden())
      .andExpect(jsonPath("$.errorCode").value("CONTENT_NOT_VISIBLE"));

    Cookie goldCookie = loginUser("gold-post-image-reader", MemberLevel.GOLD);
    mvc.perform(get("/api/media/" + imageAsset.getId() + "/access").cookie(goldCookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.url").value("http://minio.local/images/gold-post.jpg"));
  }

  @Test
  void unlinkedMediaAccessIsLimitedToAdmins() throws Exception {
    UserEntity admin = userRepository.findByUsername("admin").orElseThrow();
    MediaAssetEntity asset = createMediaAsset(admin, "images/draft-only.jpg", com.rinana.media.media.MediaType.IMAGE);
    given(mediaStorageService.createAccessUrl("rinana-media", "images/draft-only.jpg")).willReturn(
      new MediaAccessUrl(URI.create("http://minio.local/images/draft-only.jpg"), Instant.parse("2026-01-01T00:15:00Z"))
    );

    Cookie normalCookie = loginUser("normal-unlinked-reader", MemberLevel.DIAMOND);
    mvc.perform(get("/api/media/" + asset.getId() + "/access").cookie(normalCookie))
      .andExpect(status().isForbidden())
      .andExpect(jsonPath("$.errorCode").value("CONTENT_NOT_VISIBLE"));

    Cookie adminCookie = login("admin", "admin123456");
    mvc.perform(get("/api/media/" + asset.getId() + "/access").cookie(adminCookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.url").value("http://minio.local/images/draft-only.jpg"));
  }

  private Cookie loginUser(String username) throws Exception {
    UserEntity user = new UserEntity();
    user.setUsername(username);
    user.setEmail(username + "@example.com");
    user.setPasswordHash(passwordEncoder.encode("password123"));
    user.setDisplayName(username);
    user.setRole(Role.USER);
    user.setMemberLevel(MemberLevel.NORMAL);
    user.setStatus(UserStatus.ACTIVE);
    user.setCreatedAt(Instant.now());
    user.setUpdatedAt(Instant.now());
    userRepository.saveUser(user);
    return login(username, "password123");
  }

  private Cookie loginUser(String username, MemberLevel level) throws Exception {
    UserEntity user = new UserEntity();
    user.setUsername(username);
    user.setEmail(username + "@example.com");
    user.setPasswordHash(passwordEncoder.encode("password123"));
    user.setDisplayName(username);
    user.setRole(Role.USER);
    user.setMemberLevel(level);
    user.setStatus(UserStatus.ACTIVE);
    user.setCreatedAt(Instant.now());
    user.setUpdatedAt(Instant.now());
    userRepository.saveUser(user);
    return login(username, "password123");
  }

  private MediaAssetEntity createMediaAsset(UserEntity uploader, String objectKey, com.rinana.media.media.MediaType mediaType) {
    MediaAssetEntity asset = new MediaAssetEntity();
    asset.setMediaType(mediaType);
    asset.setBucketName("rinana-media");
    asset.setObjectKey(objectKey);
    asset.setOriginalName(objectKey);
    asset.setMimeType("video/mp4");
    asset.setSizeBytes(10);
    asset.setUploadedBy(uploader);
    asset.setCreatedAt(Instant.now());
    return mediaAssetRepository.save(asset);
  }

  private void createPublishedVideo(UserEntity author, MediaAssetEntity asset, ContentVisibility visibility) {
    VideoEntity video = new VideoEntity();
    video.setTitle("Diamond only");
    video.setDescription("private");
    video.setVisibility(visibility);
    video.setMediaAsset(asset);
    video.setStatus(ContentStatus.PUBLISHED);
    video.setAuthor(author);
    video.setPublishedAt(Instant.now());
    video.setCreatedAt(Instant.now());
    video.setUpdatedAt(Instant.now());
    videoRepository.save(video);
  }

  private void createPublishedAlbum(UserEntity author, MediaAssetEntity coverAsset, ContentVisibility visibility) {
    AlbumEntity album = new AlbumEntity();
    album.setTitle("Diamond album");
    album.setDescription("private");
    album.setVisibility(visibility);
    album.setCoverMedia(coverAsset);
    album.setStatus(ContentStatus.PUBLISHED);
    album.setAuthor(author);
    album.setPublishedAt(Instant.now());
    album.setCreatedAt(Instant.now());
    album.setUpdatedAt(Instant.now());
    albumRepository.save(album);
  }

  private Cookie login(String account, String password) throws Exception {
    return mvc.perform(post("/api/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(Map.of(
          "account", account,
          "password", password
        ))))
      .andExpect(status().isOk())
      .andReturn()
      .getResponse()
      .getCookie("rinana_access_token");
  }
}
