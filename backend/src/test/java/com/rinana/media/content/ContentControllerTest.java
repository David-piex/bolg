package com.rinana.media.content;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rinana.media.common.MemberLevel;
import com.rinana.media.common.Role;
import com.rinana.media.common.UserStatus;
import com.rinana.media.media.MediaAssetEntity;
import com.rinana.media.media.MediaAssetRepository;
import com.rinana.media.user.UserEntity;
import com.rinana.media.user.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.Mockito.when;
import org.junit.jupiter.api.BeforeEach;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class ContentControllerTest {
  @Autowired
  MockMvc mvc;

  @Autowired
  ObjectMapper objectMapper;

  @Autowired
  UserRepository userRepository;

  @Autowired
  MediaAssetRepository mediaAssetRepository;

  @Autowired
  PostRepository postRepository;

  @Autowired
  AlbumRepository albumRepository;

  @Autowired
  VideoRepository videoRepository;

  @Autowired
  PasswordEncoder passwordEncoder;

  @MockBean
  StringRedisTemplate redisTemplate;

  @MockBean
  ValueOperations<String, String> valueOperations;

  @BeforeEach
  void setUpRedisMocks() {
    videoRepository.deleteAll();
    albumRepository.deleteAll();
    postRepository.deleteAll();
    mediaAssetRepository.deleteAll();
    when(redisTemplate.opsForValue()).thenReturn(valueOperations);
  }

  @Test
  void filtersContentByVisitorMembershipLevel() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");
    createPost(adminCookie, "public-post", "PUBLIC");
    createPost(adminCookie, "normal-post", "NORMAL");
    createPost(adminCookie, "gold-post", "GOLD");
    createPost(adminCookie, "diamond-post", "DIAMOND");

    mvc.perform(get("/api/content"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.posts", hasSize(1)))
      .andExpect(jsonPath("$.posts[0].title").value("public-post"));

    Cookie normalCookie = loginUser("normal-reader", MemberLevel.NORMAL);
    mvc.perform(get("/api/content").cookie(normalCookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.posts", hasSize(2)));

    Cookie goldCookie = loginUser("gold-reader", MemberLevel.GOLD);
    mvc.perform(get("/api/content").cookie(goldCookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.posts", hasSize(3)));

    Cookie diamondCookie = loginUser("diamond-reader", MemberLevel.DIAMOND);
    mvc.perform(get("/api/content").cookie(diamondCookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.posts", hasSize(4)));
  }

  @Test
  void onlyAdminCanPublishPosts() throws Exception {
    Cookie normalCookie = loginUser("normal-publisher", MemberLevel.DIAMOND);

    mvc.perform(post("/api/content/posts")
        .cookie(normalCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "title", "denied",
          "content", "body",
          "visibility", "PUBLIC"
        ))))
      .andExpect(status().isForbidden())
      .andExpect(jsonPath("$.errorCode").value("ADMIN_REQUIRED"))
      .andExpect(jsonPath("$.message").value("需要管理员权限"));
  }

  @Test
  void adminCanPublishPostsWithImageMedia() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");
    MediaAssetEntity image = createMediaAsset("images/post.jpg", com.rinana.media.media.MediaType.IMAGE);

    mvc.perform(post("/api/content/posts")
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "title", "post with image",
          "content", "body",
          "visibility", "PUBLIC",
          "mediaAssetIds", java.util.List.of(image.getId().toString())
        ))))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.title").value("post with image"))
      .andExpect(jsonPath("$.mediaAssetIds[0]").value(image.getId().toString()));

    mvc.perform(get("/api/content"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.posts[0].mediaAssetIds[0]").value(image.getId().toString()));
  }

  @Test
  void contentListEndpointsSupportPagination() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");
    createPost(adminCookie, "page-one", "PUBLIC");
    createPost(adminCookie, "page-two", "PUBLIC");
    createPost(adminCookie, "page-three", "PUBLIC");

    mvc.perform(get("/api/content/posts")
        .queryParam("page", "0")
        .queryParam("size", "2"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(2)))
      .andExpect(jsonPath("$.page").value(0))
      .andExpect(jsonPath("$.size").value(2))
      .andExpect(jsonPath("$.total").value(3))
      .andExpect(jsonPath("$.totalPages").value(2));

    mvc.perform(get("/api/content/posts")
        .queryParam("page", "1")
        .queryParam("size", "2"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(1)));
  }

  @Test
  void contentListEndpointsSupportSearchAndSort() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");
    String zetaPostId = createPostAndReturnId(adminCookie, "zeta notes", "PUBLIC", "summer body");
    String alphaPostId = createPostAndReturnId(adminCookie, "alpha journal", "PUBLIC", "winter body");
    createPost(adminCookie, "hidden summer", "GOLD", "summer member body");
    setPostPublishedAt(zetaPostId, "2026-06-01T00:00:00Z");
    setPostPublishedAt(alphaPostId, "2026-06-02T00:00:00Z");

    mvc.perform(get("/api/content/posts")
        .queryParam("q", "summer")
        .queryParam("sort", "title"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(1)))
      .andExpect(jsonPath("$.items[0].title").value("zeta notes"))
      .andExpect(jsonPath("$.total").value(1));

    mvc.perform(get("/api/content/posts")
        .queryParam("sort", "oldest"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(2)))
      .andExpect(jsonPath("$.items[0].title").value("zeta notes"))
      .andExpect(jsonPath("$.items[1].title").value("alpha journal"));

    mvc.perform(get("/api/content/posts")
        .queryParam("sort", "title"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(2)))
      .andExpect(jsonPath("$.items[0].title").value("alpha journal"))
      .andExpect(jsonPath("$.items[1].title").value("zeta notes"));
  }

  @Test
  void contentListEndpointsRejectOverlongSearchQueries() throws Exception {
    String query = "x".repeat(101);

    mvc.perform(get("/api/content/posts")
        .queryParam("q", query))
      .andExpect(status().isBadRequest())
      .andExpect(jsonPath("$.errorCode").value("QUERY_TOO_LONG"));
  }

  @Test
  void contentListEndpointsSupportTaxonomyFilters() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");
    MediaAssetEntity image = createMediaAsset("images/taxonomy-cover.jpg", com.rinana.media.media.MediaType.IMAGE);
    MediaAssetEntity video = createMediaAsset("videos/taxonomy.mp4", com.rinana.media.media.MediaType.VIDEO);

    mvc.perform(post("/api/content/posts")
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "title", "studio post",
          "content", "taxonomy body",
          "category", "Studio",
          "tags", java.util.List.of("Preview", "gold", "preview"),
          "visibility", "PUBLIC"
        ))))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.category").value("Studio"))
      .andExpect(jsonPath("$.tags", hasSize(2)))
      .andExpect(jsonPath("$.tags[0]").value("preview"))
      .andExpect(jsonPath("$.tags[1]").value("gold"));

    mvc.perform(post("/api/content/albums")
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "title", "portrait album",
          "description", "taxonomy album",
          "category", "Portrait",
          "tags", java.util.List.of("gallery"),
          "visibility", "PUBLIC",
          "coverMediaId", image.getId().toString()
        ))))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.category").value("Portrait"))
      .andExpect(jsonPath("$.tags[0]").value("gallery"));

    mvc.perform(post("/api/content/videos")
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "title", "trailer video",
          "description", "taxonomy video",
          "category", "Trailer",
          "tags", java.util.List.of("preview"),
          "visibility", "PUBLIC",
          "mediaAssetId", video.getId().toString()
        ))))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.category").value("Trailer"))
      .andExpect(jsonPath("$.tags[0]").value("preview"));

    createPost(adminCookie, "daily post", "PUBLIC", "taxonomy body");

    mvc.perform(get("/api/content/posts")
        .queryParam("category", "studio"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(1)))
      .andExpect(jsonPath("$.items[0].title").value("studio post"));

    mvc.perform(get("/api/content/posts")
        .queryParam("tag", "preview"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(1)))
      .andExpect(jsonPath("$.items[0].title").value("studio post"));

    mvc.perform(get("/api/content/albums")
        .queryParam("tag", "gallery"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(1)))
      .andExpect(jsonPath("$.items[0].title").value("portrait album"));

    mvc.perform(get("/api/content/videos")
        .queryParam("category", "trailer"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(1)))
      .andExpect(jsonPath("$.items[0].title").value("trailer video"));
  }

  @Test
  void pinnedPostsAreReturnedBeforeRegularPosts() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");
    String regularPostId = createPostAndReturnId(adminCookie, "regular update", "PUBLIC", "body");
    String pinnedPostId = createPostAndReturnId(adminCookie, "pinned update", "PUBLIC", "body", true);
    setPostPublishedAt(regularPostId, "2026-06-03T00:00:00Z");
    setPostPublishedAt(pinnedPostId, "2026-06-01T00:00:00Z");

    mvc.perform(get("/api/content"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.posts", hasSize(2)))
      .andExpect(jsonPath("$.posts[0].title").value("pinned update"))
      .andExpect(jsonPath("$.posts[0].pinned").value(true));

    mvc.perform(get("/api/content/posts")
        .queryParam("sort", "oldest"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(2)))
      .andExpect(jsonPath("$.items[0].title").value("pinned update"))
      .andExpect(jsonPath("$.items[0].pinned").value(true));
  }

  @Test
  void contentDetailEndpointsRespectMembershipVisibility() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");
    String publicPostId = createPostAndReturnId(adminCookie, "public detail", "PUBLIC");
    String goldPostId = createPostAndReturnId(adminCookie, "gold detail", "GOLD");

    mvc.perform(get("/api/content/posts/" + publicPostId))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.title").value("public detail"));

    mvc.perform(get("/api/content/posts/" + goldPostId))
      .andExpect(status().isNotFound())
      .andExpect(jsonPath("$.errorCode").value("CONTENT_NOT_FOUND"));

    Cookie goldCookie = loginUser("gold-detail-reader", MemberLevel.GOLD);
    mvc.perform(get("/api/content/posts/" + goldPostId).cookie(goldCookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.title").value("gold detail"));
  }

  @Test
  void albumAndVideoDetailEndpointsReturnVisibleItems() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");
    MediaAssetEntity image = createMediaAsset("images/detail-cover.jpg", com.rinana.media.media.MediaType.IMAGE);
    MediaAssetEntity videoAsset = createMediaAsset("videos/detail.mp4", com.rinana.media.media.MediaType.VIDEO);
    String albumId = createAlbumAndReturnId(adminCookie, "album detail", "PUBLIC", image.getId());
    String videoId = createVideoAndReturnId(adminCookie, "video detail", "NORMAL", videoAsset.getId().toString(), image.getId());

    mvc.perform(get("/api/content/albums/" + albumId))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.title").value("album detail"))
      .andExpect(jsonPath("$.coverMediaId").value(image.getId().toString()));

    mvc.perform(get("/api/content/videos/" + videoId))
      .andExpect(status().isNotFound());

    Cookie normalCookie = loginUser("normal-detail-reader", MemberLevel.NORMAL);
    mvc.perform(get("/api/content/videos/" + videoId).cookie(normalCookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.title").value("video detail"))
      .andExpect(jsonPath("$.mediaAssetId").value(videoAsset.getId().toString()))
      .andExpect(jsonPath("$.coverMediaId").value(image.getId().toString()));
  }

  @Test
  void adminCanPublishAlbumsAndVideosAndFeedFiltersThemByMembership() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");
    MediaAssetEntity image = createMediaAsset("images/album.jpg", com.rinana.media.media.MediaType.IMAGE);
    MediaAssetEntity video = createMediaAsset("videos/diamond.mp4", com.rinana.media.media.MediaType.VIDEO);

    mvc.perform(post("/api/content/albums")
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "title", "gold album",
          "description", "album body",
          "visibility", "GOLD",
          "coverMediaId", image.getId().toString()
        ))))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.title").value("gold album"))
      .andExpect(jsonPath("$.coverMediaId").value(image.getId().toString()));

    mvc.perform(post("/api/content/videos")
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "title", "diamond video",
          "description", "video body",
          "visibility", "DIAMOND",
          "mediaAssetId", video.getId().toString()
        ))))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.title").value("diamond video"))
      .andExpect(jsonPath("$.mediaAssetId").value(video.getId().toString()));

    Cookie goldCookie = loginUser("gold-content-reader", MemberLevel.GOLD);
    mvc.perform(get("/api/content").cookie(goldCookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.albums", hasSize(1)))
      .andExpect(jsonPath("$.videos", hasSize(0)));

    Cookie diamondCookie = loginUser("diamond-content-reader", MemberLevel.DIAMOND);
    mvc.perform(get("/api/content").cookie(diamondCookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.albums", hasSize(1)))
      .andExpect(jsonPath("$.videos", hasSize(1)));
  }

  @Test
  void adminCanUpdatePublishedContent() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");
    String postId = createPostAndReturnId(adminCookie, "old post", "PUBLIC");
    String albumId = createAlbumAndReturnId(adminCookie, "old album", "NORMAL", null);
    MediaAssetEntity videoAsset = createMediaAsset("videos/update.mp4", com.rinana.media.media.MediaType.VIDEO);
    String videoId = createVideoAndReturnId(adminCookie, "old video", "GOLD", videoAsset.getId().toString(), null);

    mvc.perform(patch("/api/content/posts/" + postId)
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "title", "new post",
          "content", "new body",
          "visibility", "DIAMOND",
          "pinned", true
        ))))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.title").value("new post"))
      .andExpect(jsonPath("$.content").value("new body"))
      .andExpect(jsonPath("$.visibility").value("DIAMOND"))
      .andExpect(jsonPath("$.pinned").value(true));

    mvc.perform(patch("/api/content/posts/" + postId)
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "title", "new post without pin flag",
          "content", "new body",
          "visibility", "DIAMOND"
        ))))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.pinned").value(true));

    mvc.perform(patch("/api/content/albums/" + albumId)
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "title", "new album",
          "description", "new album body",
          "visibility", "GOLD"
        ))))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.title").value("new album"))
      .andExpect(jsonPath("$.description").value("new album body"))
      .andExpect(jsonPath("$.visibility").value("GOLD"));

    mvc.perform(patch("/api/content/videos/" + videoId)
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "title", "new video",
          "description", "new video body",
          "visibility", "NORMAL"
        ))))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.title").value("new video"))
      .andExpect(jsonPath("$.description").value("new video body"))
      .andExpect(jsonPath("$.visibility").value("NORMAL"));
  }

  @Test
  void draftContentIsOnlyVisibleToAdminsUntilPublished() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");
    String draftPostResponse = mvc.perform(post("/api/content/posts")
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "title", "draft post",
          "content", "draft body",
          "visibility", "PUBLIC",
          "status", "DRAFT"
        ))))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.status").value("DRAFT"))
      .andExpect(jsonPath("$.publishedAt").value(nullValue()))
      .andReturn()
      .getResponse()
      .getContentAsString();
    String draftPostId = objectMapper.readTree(draftPostResponse).get("id").asText();

    mvc.perform(get("/api/content"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.posts", hasSize(0)));

    mvc.perform(get("/api/content/posts"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(0)));

    mvc.perform(get("/api/content").cookie(adminCookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.posts", hasSize(1)))
      .andExpect(jsonPath("$.posts[0].title").value("draft post"))
      .andExpect(jsonPath("$.posts[0].status").value("DRAFT"));

    mvc.perform(patch("/api/content/posts/" + draftPostId)
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "title", "draft post renamed",
          "content", "draft body",
          "visibility", "PUBLIC"
        ))))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status").value("DRAFT"))
      .andExpect(jsonPath("$.publishedAt").value(nullValue()));

    mvc.perform(patch("/api/content/posts/" + draftPostId)
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "title", "draft post published",
          "content", "draft body",
          "visibility", "PUBLIC",
          "status", "PUBLISHED"
        ))))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status").value("PUBLISHED"))
      .andExpect(jsonPath("$.publishedAt").value(notNullValue()));

    mvc.perform(get("/api/content/posts/" + draftPostId))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.title").value("draft post published"));
  }

  @Test
  void deletedStatusCannotBeWrittenThroughCreateOrPatch() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");
    String postId = createPostAndReturnId(adminCookie, "valid post", "PUBLIC");

    mvc.perform(post("/api/content/posts")
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "title", "invalid post",
          "content", "body",
          "visibility", "PUBLIC",
          "status", "DELETED"
        ))))
      .andExpect(status().isBadRequest())
      .andExpect(jsonPath("$.errorCode").value("INVALID_CONTENT_STATUS"));

    mvc.perform(patch("/api/content/posts/" + postId)
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "title", "invalid patch",
          "content", "body",
          "visibility", "PUBLIC",
          "status", "DELETED"
        ))))
      .andExpect(status().isBadRequest())
      .andExpect(jsonPath("$.errorCode").value("INVALID_CONTENT_STATUS"));
  }

  @Test
  void adminCanDeleteContentAndNormalUserCannotDelete() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");
    String postId = createPostAndReturnId(adminCookie, "delete me", "PUBLIC");
    Cookie normalCookie = loginUser("normal-deleter", MemberLevel.DIAMOND);

    mvc.perform(delete("/api/content/posts/" + postId).cookie(normalCookie))
      .andExpect(status().isForbidden())
      .andExpect(jsonPath("$.errorCode").value("ADMIN_REQUIRED"))
      .andExpect(jsonPath("$.message").value("需要管理员权限"));

    mvc.perform(delete("/api/content/posts/" + postId).cookie(adminCookie))
      .andExpect(status().isNoContent());

    mvc.perform(get("/api/content").cookie(adminCookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.posts", hasSize(0)));
  }

  @Test
  void adminCanDeleteAlbumWithCoverMediaAndDeletedAlbumStaysHidden() throws Exception {
    Cookie adminCookie = login("admin", "admin123456");
    MediaAssetEntity cover = createMediaAsset("images/delete-album-cover.jpg", com.rinana.media.media.MediaType.IMAGE);
    String albumId = createAlbumAndReturnId(adminCookie, "delete album", "PUBLIC", cover.getId());

    mvc.perform(delete("/api/content/albums/" + albumId).cookie(adminCookie))
      .andExpect(status().isNoContent());

    mvc.perform(get("/api/content").cookie(adminCookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.albums", hasSize(0)));

    mvc.perform(get("/api/content/albums/" + albumId).cookie(adminCookie))
      .andExpect(status().isNotFound());
  }

  private void createPost(Cookie adminCookie, String title, String visibility) throws Exception {
    createPost(adminCookie, title, visibility, "body");
  }

  private void createPost(Cookie adminCookie, String title, String visibility, String content) throws Exception {
    mvc.perform(post("/api/content/posts")
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "title", title,
          "content", content,
          "visibility", visibility
        ))))
      .andExpect(status().isCreated());
  }

  private String createPostAndReturnId(Cookie adminCookie, String title, String visibility) throws Exception {
    return createPostAndReturnId(adminCookie, title, visibility, "body");
  }

  private String createPostAndReturnId(Cookie adminCookie, String title, String visibility, String content) throws Exception {
    return createPostAndReturnId(adminCookie, title, visibility, content, false);
  }

  private String createPostAndReturnId(Cookie adminCookie, String title, String visibility, String content, boolean pinned) throws Exception {
    return mvc.perform(post("/api/content/posts")
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "title", title,
          "content", content,
          "visibility", visibility,
          "pinned", pinned
        ))))
      .andExpect(status().isCreated())
      .andReturn()
      .getResponse()
      .getContentAsString()
      .replaceAll("(?s).*\"id\":\"([^\"]+)\".*", "$1");
  }

  private void setPostPublishedAt(String postId, String publishedAt) {
    PostEntity post = postRepository.findById(UUID.fromString(postId)).orElseThrow();
    post.setPublishedAt(Instant.parse(publishedAt));
    postRepository.save(post);
  }

  private String createAlbumAndReturnId(Cookie adminCookie, String title, String visibility, UUID coverMediaId) throws Exception {
    Map<String, String> payload = coverMediaId == null
      ? Map.of("title", title, "description", "body", "visibility", visibility)
      : Map.of("title", title, "description", "body", "visibility", visibility, "coverMediaId", coverMediaId.toString());
    return mvc.perform(post("/api/content/albums")
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(payload)))
      .andExpect(status().isCreated())
      .andReturn()
      .getResponse()
      .getContentAsString()
      .replaceAll("(?s).*\"id\":\"([^\"]+)\".*", "$1");
  }

  private String createVideoAndReturnId(Cookie adminCookie, String title, String visibility, String mediaAssetId, UUID coverMediaId) throws Exception {
    Map<String, String> payload = coverMediaId == null
      ? Map.of("title", title, "description", "body", "visibility", visibility, "mediaAssetId", mediaAssetId)
      : Map.of("title", title, "description", "body", "visibility", visibility, "mediaAssetId", mediaAssetId, "coverMediaId", coverMediaId.toString());
    return mvc.perform(post("/api/content/videos")
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(payload)))
      .andExpect(status().isCreated())
      .andReturn()
      .getResponse()
      .getContentAsString()
      .replaceAll("(?s).*\"id\":\"([^\"]+)\".*", "$1");
  }

  private Cookie loginUser(String username, MemberLevel level) throws Exception {
    createUser(username, username + "@example.com", Role.USER, level);
    return login(username, "password123");
  }

  private Cookie login(String account, String password) throws Exception {
    return mvc.perform(post("/api/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "account", account,
          "password", password
        ))))
      .andExpect(status().isOk())
      .andReturn()
      .getResponse()
      .getCookie("rinana_access_token");
  }

  private UserEntity createUser(String username, String email, Role role, MemberLevel level) {
    UserEntity user = new UserEntity();
    user.setUsername(username);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode("password123"));
    user.setDisplayName(username);
    user.setRole(role);
    user.setMemberLevel(level);
    user.setStatus(UserStatus.ACTIVE);
    user.setCreatedAt(Instant.now());
    user.setUpdatedAt(Instant.now());
    return userRepository.saveUser(user);
  }

  private MediaAssetEntity createMediaAsset(String objectKey, com.rinana.media.media.MediaType mediaType) {
    MediaAssetEntity media = new MediaAssetEntity();
    media.setMediaType(mediaType);
    media.setBucketName("rinana-media");
    media.setObjectKey(objectKey);
    media.setOriginalName(objectKey.substring(objectKey.lastIndexOf('/') + 1));
    media.setMimeType(mediaType == com.rinana.media.media.MediaType.IMAGE ? "image/jpeg" : "video/mp4");
    media.setSizeBytes(12);
    media.setCreatedAt(Instant.now());
    return mediaAssetRepository.save(media);
  }

  private String json(Object value) throws Exception {
    return objectMapper.writeValueAsString(value);
  }
}
