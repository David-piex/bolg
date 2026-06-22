package com.rinana.media.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rinana.media.common.MemberLevel;
import com.rinana.media.common.Role;
import com.rinana.media.common.UserStatus;
import com.rinana.media.invite.InviteCodeEntity;
import com.rinana.media.invite.InviteCodeRepository;
import com.rinana.media.invite.InviteCodeStatus;
import com.rinana.media.user.UserEntity;
import com.rinana.media.user.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class AuthControllerTest {
  @Autowired
  MockMvc mvc;

  @Autowired
  ObjectMapper objectMapper;

  @Autowired
  InviteCodeRepository inviteCodeRepository;

  @Autowired
  UserRepository userRepository;

  @Autowired
  JdbcTemplate jdbcTemplate;

  @Autowired
  PasswordEncoder passwordEncoder;

  @MockBean
  StringRedisTemplate redisTemplate;

  @MockBean
  ValueOperations<String, String> valueOperations;

  @BeforeEach
  void setUpRedisMocks() {
    when(redisTemplate.opsForValue()).thenReturn(valueOperations);
  }

  @Test
  void registerRejectsInvalidInviteCode() throws Exception {
    mvc.perform(post("/api/auth/register")
        .contentType(MediaType.APPLICATION_JSON)
        .with(csrf())
        .content(json(Map.of(
          "username", "new-user",
          "email", "new-user@example.com",
          "password", "password123",
          "inviteCode", "missing-code"
        ))))
      .andExpect(status().isBadRequest())
      .andExpect(jsonPath("$.errorCode").value("INVALID_INVITE_CODE"));
  }

  @Test
  void registerCreatesActiveUserWithInviteInitialLevel() throws Exception {
    createInvite("gold-code", MemberLevel.GOLD);

    mvc.perform(post("/api/auth/register")
        .contentType(MediaType.APPLICATION_JSON)
        .with(csrf())
        .content(json(Map.of(
          "username", "gold-user",
          "email", "gold-user@example.com",
          "password", "password123",
          "inviteCode", "gold-code"
        ))))
      .andExpect(status().isCreated())
      .andExpect(cookie().exists("rinana_access_token"))
      .andExpect(jsonPath("$.username").value("gold-user"))
      .andExpect(jsonPath("$.role").value("USER"))
      .andExpect(jsonPath("$.memberLevel").value("GOLD"));

    UserEntity created = userRepository.findByUsername("gold-user").orElseThrow();
    assertThat(created.getStatus()).isEqualTo(UserStatus.ACTIVE);
    assertThat(created.getPasswordHash()).isNotEqualTo("password123");
    assertThat(passwordEncoder.matches("password123", created.getPasswordHash())).isTrue();
  }

  @Test
  void inviteCodeCannotBeReusedAfterSingleRegistration() throws Exception {
    createInvite("single-use", MemberLevel.NORMAL);

    mvc.perform(post("/api/auth/register")
        .contentType(MediaType.APPLICATION_JSON)
        .with(csrf())
        .content(json(Map.of(
          "username", "first-user",
          "email", "first-user@example.com",
          "password", "password123",
          "inviteCode", "single-use"
        ))))
      .andExpect(status().isCreated());

    mvc.perform(post("/api/auth/register")
        .contentType(MediaType.APPLICATION_JSON)
        .with(csrf())
        .content(json(Map.of(
          "username", "second-user",
          "email", "second-user@example.com",
          "password", "password123",
          "inviteCode", "single-use"
      ))))
      .andExpect(status().isBadRequest())
      .andExpect(jsonPath("$.errorCode").value("INVALID_INVITE_CODE"));

    Integer usedCount = jdbcTemplate.queryForObject(
      "select used_count from invite_codes where code = ?",
      Integer.class,
      "single-use"
    );
    assertThat(usedCount).isEqualTo(1);
  }

  @Test
  void inviteCodeCannotBeOverusedUnderConcurrentRegistrations() throws Exception {
    createInvite("race-code", MemberLevel.NORMAL);

    ExecutorService executor = Executors.newFixedThreadPool(2);
    CountDownLatch ready = new CountDownLatch(2);
    CountDownLatch start = new CountDownLatch(1);

    try {
      Future<Integer> first = executor.submit(() -> registerWithInvite("race-a", "race-a@example.com", "race-code", ready, start));
      Future<Integer> second = executor.submit(() -> registerWithInvite("race-b", "race-b@example.com", "race-code", ready, start));

      assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
      start.countDown();

      List<Integer> statuses = List.of(first.get(30, TimeUnit.SECONDS), second.get(30, TimeUnit.SECONDS));
      assertThat(statuses).containsExactlyInAnyOrder(201, 400);
      assertThat(userRepository.findByUsername("race-a").isPresent() ^ userRepository.findByUsername("race-b").isPresent()).isTrue();

      Integer usedCount = jdbcTemplate.queryForObject(
        "select used_count from invite_codes where code = ?",
        Integer.class,
        "race-code"
      );
      assertThat(usedCount).isEqualTo(1);
    } finally {
      start.countDown();
      executor.shutdownNow();
    }
  }

  @Test
  void loginAcceptsUsernameOrEmailAndMeReturnsCurrentUser() throws Exception {
    createUser("login-user", "login-user@example.com", "password123", MemberLevel.DIAMOND, UserStatus.ACTIVE);

    var loginResponse = mvc.perform(post("/api/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .with(csrf())
        .content(json(Map.of(
          "account", "login-user",
          "password", "password123"
        ))))
      .andExpect(status().isOk())
      .andExpect(cookie().exists("rinana_access_token"))
      .andExpect(cookie().exists("rinana_refresh_token"))
      .andExpect(cookie().maxAge("rinana_refresh_token", 14 * 24 * 60 * 60))
      .andExpect(jsonPath("$.username").value("login-user"))
      .andReturn()
      .getResponse();

    Cookie cookie = loginResponse.getCookie("rinana_access_token");
    Cookie refreshCookie = loginResponse.getCookie("rinana_refresh_token");
    assertThat(refreshCookie).isNotNull();
    verify(valueOperations).set(any(String.class), any(String.class), eq(Duration.ofDays(14)));

    mvc.perform(get("/api/auth/me").cookie(cookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.email").value("login-user@example.com"))
      .andExpect(jsonPath("$.memberLevel").value("DIAMOND"));

    mvc.perform(post("/api/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .with(csrf())
        .content(json(Map.of(
          "account", "login-user@example.com",
          "password", "password123"
        ))))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.username").value("login-user"));
  }

  @Test
  void refreshUsesRedisBackedRefreshCookieAndLogoutRevokesIt() throws Exception {
    UserEntity user = createUser("refresh-user", "refresh-user@example.com", "password123", MemberLevel.GOLD, UserStatus.ACTIVE);

    Cookie refreshCookie = mvc.perform(post("/api/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .with(csrf())
        .content(json(Map.of(
          "account", "refresh-user",
          "password", "password123"
        ))))
      .andExpect(status().isOk())
      .andReturn()
      .getResponse()
      .getCookie("rinana_refresh_token");

    assertThat(refreshCookie).isNotNull();
    when(valueOperations.get(any(String.class))).thenReturn(user.getId().toString());

    mvc.perform(post("/api/auth/refresh").cookie(refreshCookie).with(csrf()))
      .andExpect(status().isOk())
      .andExpect(cookie().exists("rinana_access_token"))
      .andExpect(jsonPath("$.username").value("refresh-user"));

    mvc.perform(post("/api/auth/logout").cookie(refreshCookie).with(csrf()))
      .andExpect(status().isNoContent())
      .andExpect(cookie().maxAge("rinana_access_token", 0))
      .andExpect(cookie().maxAge("rinana_refresh_token", 0));

    verify(redisTemplate).delete(any(String.class));
  }

  @Test
  void disabledUsersCannotRefreshAndRefreshTokenIsRevoked() throws Exception {
    UserEntity user = createUser("disabled-refresh-user", "disabled-refresh@example.com", "password123", MemberLevel.GOLD, UserStatus.DISABLED);
    Cookie refreshCookie = new Cookie("rinana_refresh_token", "refresh-token-value");
    when(valueOperations.get(any(String.class))).thenReturn(user.getId().toString());

    mvc.perform(post("/api/auth/refresh").cookie(refreshCookie).with(csrf()))
      .andExpect(status().isForbidden())
      .andExpect(cookie().maxAge("rinana_refresh_token", 0))
      .andExpect(jsonPath("$.errorCode").value("USER_DISABLED"));

    verify(redisTemplate).delete(any(String.class));
  }

  @Test
  void disabledUsersCannotLogin() throws Exception {
    createUser("disabled-user", "disabled-user@example.com", "password123", MemberLevel.NORMAL, UserStatus.DISABLED);

    mvc.perform(post("/api/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .with(csrf())
        .content(json(Map.of(
          "account", "disabled-user",
          "password", "password123"
        ))))
      .andExpect(status().isForbidden())
      .andExpect(jsonPath("$.errorCode").value("USER_DISABLED"));
  }

  private void createInvite(String code, MemberLevel initialLevel) {
    InviteCodeEntity invite = new InviteCodeEntity();
    invite.setCode(code);
    invite.setInitialLevel(initialLevel);
    invite.setMaxUses(1);
    invite.setUsedCount(0);
    invite.setStatus(InviteCodeStatus.ACTIVE);
    invite.setCreatedAt(Instant.now());
    inviteCodeRepository.save(invite);
  }

  private UserEntity createUser(String username, String email, String password, MemberLevel level, UserStatus status) {
    UserEntity user = new UserEntity();
    user.setUsername(username);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(password));
    user.setDisplayName(username);
    user.setRole(Role.USER);
    user.setMemberLevel(level);
    user.setStatus(status);
    user.setCreatedAt(Instant.now());
    user.setUpdatedAt(Instant.now());
    return userRepository.saveUser(user);
  }

  private String json(Object value) throws Exception {
    return objectMapper.writeValueAsString(value);
  }

  private int registerWithInvite(String username, String email, String inviteCode, CountDownLatch ready, CountDownLatch start) throws Exception {
    ready.countDown();
    assertThat(start.await(10, TimeUnit.SECONDS)).isTrue();

    return mvc.perform(post("/api/auth/register")
        .contentType(MediaType.APPLICATION_JSON)
        .with(csrf())
        .content(json(Map.of(
          "username", username,
          "email", email,
          "password", "password123",
          "inviteCode", inviteCode
        ))))
      .andReturn()
      .getResponse()
      .getStatus();
  }
}
