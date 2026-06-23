package com.rinana.media.auth;

import com.rinana.media.user.UserEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RefreshTokenService {
  static final String REFRESH_COOKIE = "rinana_refresh_token";
  private static final String KEY_PREFIX = "rinana:refresh:";

  private final StringRedisTemplate redisTemplate;
  private final Duration refreshTtl;
  private final Map<String, StoredRefreshToken> fallbackTokens = new ConcurrentHashMap<>();

  public RefreshTokenService(
    StringRedisTemplate redisTemplate,
    @Value("${rinana.auth.refresh-token-days:30}") long refreshTokenDays
  ) {
    this.redisTemplate = redisTemplate;
    this.refreshTtl = Duration.ofDays(refreshTokenDays);
  }

  public String create(UserEntity user) {
    if (fallbackTokens.size() > 100) {
      fallbackTokens.entrySet().removeIf(entry -> entry.getValue().isExpired());
    }
    String token = UUID.randomUUID() + "." + UUID.randomUUID();
    try {
      redisTemplate.opsForValue().set(keyFor(token), user.getId().toString(), refreshTtl);
    } catch (RedisConnectionFailureException | IllegalStateException exception) {
      fallbackTokens.put(token, new StoredRefreshToken(user.getId().toString(), Instant.now().plus(refreshTtl)));
    }
    return token;
  }

  public UUID requireUserId(String token) {
    try {
      String userId = redisTemplate.opsForValue().get(keyFor(token));
      if (userId != null && !userId.isBlank()) {
        return UUID.fromString(userId);
      }
    } catch (RedisConnectionFailureException | IllegalStateException exception) {
      StoredRefreshToken fallback = fallbackTokens.get(token);
      if (fallback != null && !fallback.isExpired()) {
        return UUID.fromString(fallback.userId());
      }
    }

    StoredRefreshToken fallback = fallbackTokens.get(token);
    if (fallback != null) {
      if (!fallback.isExpired()) {
        return UUID.fromString(fallback.userId());
      }
      fallbackTokens.remove(token);
    }

    throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "刷新登录已失效，请重新登录");
  }

  public void revoke(String token) {
    if (token == null || token.isBlank()) {
      return;
    }

    try {
      redisTemplate.delete(keyFor(token));
    } catch (RedisConnectionFailureException | IllegalStateException exception) {
      // Ignore and fall back to in-memory revocation.
    }

    fallbackTokens.remove(token);
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

  private record StoredRefreshToken(String userId, Instant expiresAt) {
    boolean isExpired() {
      return expiresAt.isBefore(Instant.now());
    }
  }
}
