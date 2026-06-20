package com.rinana.media.account;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rinana.media.common.MemberLevel;
import com.rinana.media.common.Role;
import com.rinana.media.common.UserStatus;
import com.rinana.media.media.MediaAccessUrl;
import com.rinana.media.media.MediaStorageService;
import com.rinana.media.media.MediaType;
import com.rinana.media.media.StoredMediaObject;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.net.URI;
import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class AccountControllerTest {
  @Autowired
  MockMvc mvc;

  @Autowired
  ObjectMapper objectMapper;

  @Autowired
  PasswordEncoder passwordEncoder;

  @Autowired
  UserRepository userRepository;

  @MockBean
  MediaStorageService mediaStorageService;

  @MockBean
  StringRedisTemplate redisTemplate;

  @MockBean
  ValueOperations<String, String> valueOperations;

  @BeforeEach
  void setUpRedisMocks() {
    when(redisTemplate.opsForValue()).thenReturn(valueOperations);
  }

  @Test
  void returnsCurrentProfileWithAvatarAccessPath() throws Exception {
    UserEntity user = createUser("profile-user", "profile-user@example.com", "password123");
    user.setAvatarUrl("rinana-media/avatars/profile-user.webp");
    userRepository.saveUser(user);

    mvc.perform(get("/api/account/profile").cookie(login("profile-user", "password123")))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.email").value("profile-user@example.com"))
      .andExpect(jsonPath("$.avatarUrl").value("/api/account/avatar"));
  }

  @Test
  void changesPasswordWithOldPasswordAndMatchingConfirmation() throws Exception {
    createUser("password-user", "password-user@example.com", "password123");

    mvc.perform(patch("/api/account/password")
        .cookie(login("password-user", "password123"))
        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "oldPassword", "password123",
          "newPassword", "new-password-123",
          "confirmPassword", "new-password-123"
        ))))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.email").value("password-user@example.com"));

    mvc.perform(post("/api/auth/login")
        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
        .content(json(Map.of("account", "password-user", "password", "password123"))))
      .andExpect(status().isUnauthorized());

    mvc.perform(post("/api/auth/login")
        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
        .content(json(Map.of("account", "password-user", "password", "new-password-123"))))
      .andExpect(status().isOk());
  }

  @Test
  void rejectsPasswordChangeWhenConfirmationDoesNotMatch() throws Exception {
    createUser("password-mismatch", "password-mismatch@example.com", "password123");

    mvc.perform(patch("/api/account/password")
        .cookie(login("password-mismatch", "password123"))
        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "oldPassword", "password123",
          "newPassword", "new-password-123",
          "confirmPassword", "another-password"
        ))))
      .andExpect(status().isBadRequest())
      .andExpect(jsonPath("$.errorCode").value("PASSWORD_CONFIRM_MISMATCH"));
  }

  @Test
  void changesEmailWithOldPasswordAndMatchingConfirmation() throws Exception {
    createUser("email-user", "email-user@example.com", "password123");

    mvc.perform(patch("/api/account/email")
        .cookie(login("email-user", "password123"))
        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "oldPassword", "password123",
          "newEmail", "changed@example.com",
          "confirmEmail", "changed@example.com"
        ))))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.email").value("changed@example.com"));

    assertThat(userRepository.findByEmail("changed@example.com")).isPresent();
  }

  @Test
  void rejectsDuplicateEmailChanges() throws Exception {
    createUser("email-owner", "taken@example.com", "password123");
    createUser("email-change", "email-change@example.com", "password123");

    mvc.perform(patch("/api/account/email")
        .cookie(login("email-change", "password123"))
        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "oldPassword", "password123",
          "newEmail", "taken@example.com",
          "confirmEmail", "taken@example.com"
        ))))
      .andExpect(status().isBadRequest())
      .andExpect(jsonPath("$.errorCode").value("EMAIL_EXISTS"));
  }

  @Test
  void uploadsAvatarWithTenMegabyteLimitAndDedicatedAccessPath() throws Exception {
    createUser("avatar-user", "avatar-user@example.com", "password123");
    given(mediaStorageService.store(any(), eq(MediaType.IMAGE), eq("avatars"))).willReturn(
      new StoredMediaObject("rinana-media", "avatars/avatar-user.webp")
    );
    given(mediaStorageService.createAccessUrl("rinana-media", "avatars/avatar-user.webp")).willReturn(
      new MediaAccessUrl(URI.create("http://minio.local/avatars/avatar-user.webp"), Instant.parse("2026-01-01T00:15:00Z"))
    );
    MockMultipartFile avatar = new MockMultipartFile(
      "file",
      "avatar.webp",
      "image/webp",
      new byte[] {1, 2, 3}
    );
    Cookie cookie = login("avatar-user", "password123");

    mvc.perform(multipart("/api/account/avatar").file(avatar).cookie(cookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.avatarUrl").value("/api/account/avatar"));

    mvc.perform(get("/api/account/avatar").cookie(cookie))
      .andExpect(status().isFound())
      .andExpect(header().string("Location", "http://minio.local/avatars/avatar-user.webp"));
  }

  @Test
  void rejectsAvatarFilesLargerThanTenMegabytes() throws Exception {
    createUser("avatar-large", "avatar-large@example.com", "password123");
    MockMultipartFile avatar = new MockMultipartFile(
      "file",
      "avatar.png",
      "image/png",
      new byte[(10 * 1024 * 1024) + 1]
    );

    mvc.perform(multipart("/api/account/avatar").file(avatar).cookie(login("avatar-large", "password123")))
      .andExpect(status().isBadRequest())
      .andExpect(jsonPath("$.errorCode").value("AVATAR_TOO_LARGE"));
  }

  private UserEntity createUser(String username, String email, String password) {
    UserEntity user = new UserEntity();
    user.setUsername(username);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(password));
    user.setDisplayName(username);
    user.setRole(Role.USER);
    user.setMemberLevel(MemberLevel.NORMAL);
    user.setStatus(UserStatus.ACTIVE);
    user.setCreatedAt(Instant.now());
    user.setUpdatedAt(Instant.now());
    return userRepository.saveUser(user);
  }

  private Cookie login(String account, String password) throws Exception {
    return mvc.perform(post("/api/auth/login")
        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
        .content(json(Map.of("account", account, "password", password))))
      .andExpect(status().isOk())
      .andReturn()
      .getResponse()
      .getCookie("rinana_access_token");
  }

  private String json(Object value) throws Exception {
    return objectMapper.writeValueAsString(value);
  }
}
