package com.rinana.media.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {
  private final SecretKey key;
  private final Duration accessTokenTtl;

  public JwtService(
    @Value("${rinana.auth.jwt-secret}") String secret,
    @Value("${rinana.auth.access-token-minutes}") long accessTokenMinutes
  ) {
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.accessTokenTtl = Duration.ofMinutes(accessTokenMinutes);
  }

  public String createAccessToken(UUID userId) {
    Instant now = Instant.now();
    return Jwts.builder()
      .subject(userId.toString())
      .issuedAt(Date.from(now))
      .expiration(Date.from(now.plus(accessTokenTtl)))
      .signWith(key)
      .compact();
  }

  public UUID parseUserId(String token) {
    Claims claims = Jwts.parser()
      .verifyWith(key)
      .build()
      .parseSignedClaims(token)
      .getPayload();
    return UUID.fromString(claims.getSubject());
  }
}
