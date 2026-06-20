package com.rinana.media.media;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "rinana.minio")
public record MediaStorageProperties(
  String endpoint,
  String publicEndpoint,
  String accessKey,
  String secretKey,
  String bucket,
  String region
) {
  public MediaStorageProperties {
    if (region == null || region.isBlank()) {
      region = "us-east-1";
    }
  }

  public String accessEndpoint() {
    return publicEndpoint == null || publicEndpoint.isBlank() ? endpoint : publicEndpoint;
  }
}
