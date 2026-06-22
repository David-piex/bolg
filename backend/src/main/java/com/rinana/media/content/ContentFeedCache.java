package com.rinana.media.content;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rinana.media.common.MemberLevel;
import com.rinana.media.common.Role;
import com.rinana.media.user.UserEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

@Service
public class ContentFeedCache {
  private static final Logger log = LoggerFactory.getLogger(ContentFeedCache.class);
  private static final String KEY_PREFIX = "rinana:content:feed:";
  private static final List<String> AUDIENCE_KEYS = List.of(
    "anonymous",
    "member:NORMAL",
    "member:GOLD",
    "member:DIAMOND",
    "admin"
  );

  private final StringRedisTemplate redisTemplate;
  private final ObjectMapper objectMapper;
  private final Duration ttl;

  public ContentFeedCache(
    StringRedisTemplate redisTemplate,
    ObjectMapper objectMapper,
    @Value("${rinana.content.feed-cache-ttl-ms:300000}") long ttlMs
  ) {
    this.redisTemplate = redisTemplate;
    this.objectMapper = objectMapper;
    this.ttl = Duration.ofMillis(Math.max(1000, ttlMs));
  }

  public String keyFor(UserEntity viewer) {
    if (viewer == null) {
      return "anonymous";
    }
    if (viewer.getRole() == Role.ADMIN || viewer.getRole() == Role.SUPER_ADMIN) {
      return "admin";
    }
    MemberLevel memberLevel = viewer.getMemberLevel() == null ? MemberLevel.NORMAL : viewer.getMemberLevel();
    return "member:" + memberLevel.name();
  }

  public Optional<ContentFeedResponse> get(String audienceKey) {
    try {
      String cachedJson = redisTemplate.opsForValue().get(redisKey(audienceKey));
      if (cachedJson == null || cachedJson.isBlank()) {
        return Optional.empty();
      }
      return Optional.of(objectMapper.readValue(cachedJson, ContentFeedResponse.class));
    } catch (Exception exception) {
      log.debug("Content feed cache read failed", exception);
      return Optional.empty();
    }
  }

  public void put(String audienceKey, ContentFeedResponse response) {
    try {
      redisTemplate.opsForValue().set(redisKey(audienceKey), objectMapper.writeValueAsString(response), ttl);
    } catch (Exception exception) {
      log.debug("Content feed cache write failed", exception);
    }
  }

  public void evictAllAfterCommit() {
    if (!TransactionSynchronizationManager.isSynchronizationActive()) {
      evictAll();
      return;
    }

    TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
      @Override
      public void afterCommit() {
        evictAll();
      }
    });
  }

  void evictAll() {
    try {
      redisTemplate.delete(AUDIENCE_KEYS.stream()
        .map(this::redisKey)
        .toList());
    } catch (Exception exception) {
      log.debug("Content feed cache eviction failed", exception);
    }
  }

  private String redisKey(String audienceKey) {
    return KEY_PREFIX + audienceKey;
  }
}
