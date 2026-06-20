package com.rinana.media.auth;

import com.rinana.media.common.Role;
import com.rinana.media.common.UserStatus;
import com.rinana.media.invite.InviteCodeEntity;
import com.rinana.media.invite.InviteCodeRepository;
import com.rinana.media.invite.InviteCodeStatus;
import com.rinana.media.user.JpaUserRepository;
import com.rinana.media.user.UserEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class AuthService {
  private final JpaUserRepository userRepository;
  private final InviteCodeRepository inviteCodeRepository;
  private final PasswordEncoder passwordEncoder;

  public AuthService(
    JpaUserRepository userRepository,
    InviteCodeRepository inviteCodeRepository,
    PasswordEncoder passwordEncoder
  ) {
    this.userRepository = userRepository;
    this.inviteCodeRepository = inviteCodeRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @Transactional
  public UserEntity register(RegisterRequest request) {
    InviteCodeEntity invite = inviteCodeRepository.findByCode(request.inviteCode())
      .filter(this::isInviteUsable)
      .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_INVITE_CODE", "邀请码无效或已不可用"));

    if (userRepository.existsByUsername(request.username())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "USERNAME_EXISTS", "用户名已存在");
    }
    if (userRepository.existsByEmail(request.email())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "EMAIL_EXISTS", "邮箱已存在");
    }

    Instant now = Instant.now();
    UserEntity user = new UserEntity();
    user.setUsername(request.username());
    user.setEmail(request.email());
    user.setPasswordHash(passwordEncoder.encode(request.password()));
    user.setDisplayName(request.username());
    user.setRole(Role.USER);
    user.setMemberLevel(invite.getInitialLevel());
    user.setStatus(UserStatus.ACTIVE);
    user.setCreatedAt(now);
    user.setUpdatedAt(now);

    invite.setUsedCount(invite.getUsedCount() + 1);
    inviteCodeRepository.save(invite);
    return userRepository.saveUser(user);
  }

  public UserEntity login(LoginRequest request) {
    UserEntity user = userRepository.findByUsername(request.account())
      .or(() -> userRepository.findByEmail(request.account()))
      .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "账号或密码错误"));

    if (user.getStatus() == UserStatus.DISABLED) {
      throw new ApiException(HttpStatus.FORBIDDEN, "USER_DISABLED", "账号已被禁用");
    }
    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "账号或密码错误");
    }
    return user;
  }

  public UserEntity requireUser(UUID userId) {
    return userRepository.findUserById(userId)
      .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "请先登录"));
  }

  private boolean isInviteUsable(InviteCodeEntity invite) {
    if (invite.getStatus() != InviteCodeStatus.ACTIVE) {
      return false;
    }
    if (invite.getUsedCount() >= invite.getMaxUses()) {
      return false;
    }
    return invite.getExpiresAt() == null || invite.getExpiresAt().isAfter(Instant.now());
  }
}
