package com.rinana.media.user;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "rinana.super-admin")
public record SuperAdminProperties(
  String username,
  String email,
  String password,
  String displayName
) {
}
