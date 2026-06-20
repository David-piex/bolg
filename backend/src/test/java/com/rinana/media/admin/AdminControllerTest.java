package com.rinana.media.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rinana.media.common.MemberLevel;
import com.rinana.media.common.Role;
import com.rinana.media.common.UserStatus;
import com.rinana.media.invite.InviteCodeRepository;
import com.rinana.media.invite.InviteCodeStatus;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class AdminControllerTest {
  @Autowired
  MockMvc mvc;

  @Autowired
  ObjectMapper objectMapper;

  @Autowired
  InviteCodeRepository inviteCodeRepository;

  @Autowired
  UserRepository userRepository;

  @Autowired
  PasswordEncoder passwordEncoder;

  @Autowired
  JdbcTemplate jdbcTemplate;

  @MockBean
  StringRedisTemplate redisTemplate;

  @MockBean
  ValueOperations<String, String> valueOperations;

  @BeforeEach
  void setUpRedisMocks() {
    jdbcTemplate.update("delete from admin_audit_logs");
    when(redisTemplate.opsForValue()).thenReturn(valueOperations);
  }

  @Test
  void superAdminCanCreateListAndDisableInviteCodes() throws Exception {
    Cookie adminCookie = loginAdmin();

    mvc.perform(post("/api/admin/invites")
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "code", "diamond-code",
          "initialLevel", "DIAMOND",
          "maxUses", 2
        ))))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.code").value("diamond-code"))
      .andExpect(jsonPath("$.initialLevel").value("DIAMOND"));

    mvc.perform(get("/api/admin/invites").cookie(adminCookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$[0].code").value("diamond-code"));

    var invite = inviteCodeRepository.findByCode("diamond-code").orElseThrow();
    mvc.perform(delete("/api/admin/invites/" + invite.getId()).cookie(adminCookie))
      .andExpect(status().isNoContent());

    assertThat(inviteCodeRepository.findByCode("diamond-code").orElseThrow().getStatus())
      .isEqualTo(InviteCodeStatus.DISABLED);

    assertThat(auditCount("CREATE_INVITE", "INVITE_CODE")).isEqualTo(1);
    assertThat(auditCount("DISABLE_INVITE", "INVITE_CODE")).isEqualTo(1);
  }

  @Test
  void superAdminCanManuallyAdjustUserLevelAndDisabledStatus() throws Exception {
    Cookie adminCookie = loginAdmin();
    UserEntity user = createUser("member-edit", "member-edit@example.com");

    mvc.perform(patch("/api/admin/users/" + user.getId())
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "memberLevel", "GOLD",
          "disabled", true
        ))))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.memberLevel").value("GOLD"))
      .andExpect(jsonPath("$.status").value("DISABLED"));

    UserEntity updated = userRepository.findUserById(user.getId()).orElseThrow();
    assertThat(updated.getMemberLevel()).isEqualTo(MemberLevel.GOLD);
    assertThat(updated.getStatus()).isEqualTo(UserStatus.DISABLED);
    assertThat(auditCount("UPDATE_USER", "USER")).isEqualTo(1);
  }

  @Test
  void superAdminCanListUsersForManagement() throws Exception {
    Cookie adminCookie = loginAdmin();
    createUser("member-list", "member-list@example.com");

    mvc.perform(get("/api/admin/users").cookie(adminCookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$[?(@.username == 'admin')]").isEmpty())
      .andExpect(jsonPath("$[?(@.username == 'member-list')].memberLevel").value("NORMAL"))
      .andExpect(jsonPath("$[?(@.username == 'member-list')].status").value("ACTIVE"));
  }

  @Test
  void superAdminAccountCannotBeModifiedFromAdminApi() throws Exception {
    Cookie adminCookie = loginAdmin();
    UserEntity superAdmin = userRepository.findByUsername("admin").orElseThrow();

    mvc.perform(patch("/api/admin/users/" + superAdmin.getId())
        .cookie(adminCookie)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(Map.of(
          "memberLevel", "NORMAL",
          "disabled", true
        ))))
      .andExpect(status().isForbidden())
      .andExpect(jsonPath("$.errorCode").value("SUPER_ADMIN_PROTECTED"));
  }

  @Test
  void normalUserCannotUseAdminEndpoints() throws Exception {
    createUser("normal-admin-denied", "normal-admin-denied@example.com");
    Cookie userCookie = login("normal-admin-denied", "password123");

    mvc.perform(get("/api/admin/invites").cookie(userCookie))
      .andExpect(status().isForbidden())
      .andExpect(jsonPath("$.errorCode").value("ADMIN_REQUIRED"));
  }

  private Cookie loginAdmin() throws Exception {
    return login("admin", "admin123456");
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

  private UserEntity createUser(String username, String email) {
    UserEntity user = new UserEntity();
    user.setUsername(username);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode("password123"));
    user.setDisplayName(username);
    user.setRole(Role.USER);
    user.setMemberLevel(MemberLevel.NORMAL);
    user.setStatus(UserStatus.ACTIVE);
    user.setCreatedAt(Instant.now());
    user.setUpdatedAt(Instant.now());
    return userRepository.saveUser(user);
  }

  private String json(Object value) throws Exception {
    return objectMapper.writeValueAsString(value);
  }

  private Integer auditCount(String actionType, String targetType) {
    return jdbcTemplate.queryForObject(
      "select count(*) from admin_audit_logs where action_type = ? and target_type = ?",
      Integer.class,
      actionType,
      targetType
    );
  }
}
