package com.rinana.media.user;

import com.rinana.media.common.MemberLevel;
import com.rinana.media.common.Role;
import com.rinana.media.common.UserStatus;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;

@Component
public class SuperAdminBootstrap implements ApplicationRunner {
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final SuperAdminProperties properties;
  private final Clock clock;

  @Autowired
  public SuperAdminBootstrap(
    UserRepository userRepository,
    PasswordEncoder passwordEncoder,
    SuperAdminProperties properties
  ) {
    this(userRepository, passwordEncoder, properties, Clock.systemUTC());
  }

  SuperAdminBootstrap(
    UserRepository userRepository,
    PasswordEncoder passwordEncoder,
    SuperAdminProperties properties,
    Clock clock
  ) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.properties = properties;
    this.clock = clock;
  }

  @Override
  public void run(ApplicationArguments args) {
    run();
  }

  @Transactional
  public void run() {
    if (userRepository.countByRole(Role.SUPER_ADMIN) > 0) {
      return;
    }

    Instant now = Instant.now(clock);
    UserEntity user = new UserEntity();
    user.setUsername(properties.username());
    user.setEmail(properties.email());
    user.setPasswordHash(passwordEncoder.encode(properties.password()));
    user.setDisplayName(properties.displayName());
    user.setRole(Role.SUPER_ADMIN);
    user.setMemberLevel(MemberLevel.DIAMOND);
    user.setStatus(UserStatus.ACTIVE);
    user.setCreatedAt(now);
    user.setUpdatedAt(now);
    userRepository.saveUser(user);
  }
}
