package com.rinana.media.user;

import com.rinana.media.common.MemberLevel;
import com.rinana.media.common.Role;
import com.rinana.media.common.UserStatus;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class SuperAdminBootstrapTest {
  private final UserRepository userRepository = new InMemoryUserRepository();
  private final PasswordEncoder passwordEncoder = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
  private final SuperAdminProperties properties = new SuperAdminProperties(
    "admin",
    "admin@example.com",
    "admin123456",
    "站长"
  );
  private final SuperAdminBootstrap bootstrap = new SuperAdminBootstrap(
    userRepository,
    passwordEncoder,
    properties
  );

  @Test
  void createsSuperAdminWhenNoneExists() {
    bootstrap.run();

    UserEntity superAdmin = userRepository.findByRole(Role.SUPER_ADMIN).orElseThrow();
    assertThat(superAdmin.getUsername()).isEqualTo("admin");
    assertThat(superAdmin.getEmail()).isEqualTo("admin@example.com");
    assertThat(superAdmin.getDisplayName()).isEqualTo("站长");
    assertThat(superAdmin.getRole()).isEqualTo(Role.SUPER_ADMIN);
    assertThat(superAdmin.getMemberLevel()).isEqualTo(MemberLevel.DIAMOND);
    assertThat(superAdmin.getStatus()).isEqualTo(UserStatus.ACTIVE);
    assertThat(superAdmin.getPasswordHash()).isNotEqualTo("admin123456");
    assertThat(passwordEncoder.matches("admin123456", superAdmin.getPasswordHash())).isTrue();
  }

  @Test
  void doesNotCreateDuplicateSuperAdmin() {
    bootstrap.run();
    bootstrap.run();

    assertThat(userRepository.countByRole(Role.SUPER_ADMIN)).isEqualTo(1);
  }

  @Test
  void keepsExistingSuperAdmin() {
    UserEntity existing = new UserEntity();
    existing.setUsername("owner");
    existing.setEmail("owner@example.com");
    existing.setPasswordHash("already-encoded");
    existing.setDisplayName("Owner");
    existing.setRole(Role.SUPER_ADMIN);
    existing.setMemberLevel(MemberLevel.DIAMOND);
    existing.setStatus(UserStatus.ACTIVE);
    existing.setCreatedAt(Instant.parse("2026-01-01T00:00:00Z"));
    existing.setUpdatedAt(Instant.parse("2026-01-01T00:00:00Z"));
    userRepository.saveUser(existing);

    bootstrap.run();

    assertThat(userRepository.countByRole(Role.SUPER_ADMIN)).isEqualTo(1);
    assertThat(userRepository.findByRole(Role.SUPER_ADMIN).orElseThrow().getUsername()).isEqualTo("owner");
  }
}
