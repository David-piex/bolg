package com.rinana.media.auth;

import com.rinana.media.user.UserEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Base64;
import java.util.UUID;

@Service
public class RefreshTokenService {
  static final String REFRESH_COOKIE = "rinana_refresh_token";
  private static final String KEY_PREFIX = "rinana:refresh:";

  private final StringRedisTemplate redisTemplate;
  private final Duration refreshTtl;

  public RefreshTokenService(
    StringRedisTemplate redisTemplate,
    @Value("${rinana.auth.refresh-token-days:30}") long refreshTokenDays
  ) {
    this.redisTemplate = redisTemplate;
    this.refreshTtl = Duration.ofDays(refreshTokenDays);
  }

  public String create(UserEntity user) {
    String token = UUID.randomUUID() + "." + UUID.randomUUID();
    redisTemplate.opsForValue().set(keyFor(token), user.getId().toString(), refreshTtl);
    return token;
  }

  public UUID requireUserId(String token) {
    String userId = redisTemplate.opsForValue().get(keyFor(token));
    if (userId == null || userId.isBlank()) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "刷新登录已失效，请重新登录");
    }
    return UUID.fromString(userId);
  }

  public void revoke(String token) {
    if (token == null || token.isBlank()) {
      return;
    }
    redisTemplate.delete(keyFor(token));
  }

  public int cookieMaxAgeSeconds() {
    return Math.toIntExact(refreshTtl.toSeconds());
  }

  private String keyFor(String token) {
    return KEY_PREFIX + sha256(token);
  }

  private String sha256(String value) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hashed = digest.digest(value.getBytes(StandardCharsets.UTF_8));
      return Base64.getUrlEncoder().withoutPadding().encodeToString(hashed);
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is not available", exception);
    }
  }
}
