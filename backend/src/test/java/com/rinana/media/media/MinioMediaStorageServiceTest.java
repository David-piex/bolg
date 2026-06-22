package com.rinana.media.media;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MinioMediaStorageServiceTest {
  @Test
  void createsAccessUrlsWithPublicEndpoint() {
    MinioMediaStorageService service = new MinioMediaStorageService(new MediaStorageProperties(
      "http://minio:9000",
      "http://media.example.com:9000",
      "rinana_minio",
      "rinana_minio_secret",
      "rinana-media",
      "us-east-1"
    ));

    MediaAccessUrl accessUrl = service.createAccessUrl("rinana-media", "videos/demo.mp4");

    assertThat(accessUrl.url().getHost()).isEqualTo("media.example.com");
    assertThat(accessUrl.url().getPort()).isEqualTo(9000);
    assertThat(accessUrl.url().getPath()).isEqualTo("/rinana-media/videos/demo.mp4");
  }

  @Test
  void reusesFreshAccessUrlsForTheSameObject() {
    MinioMediaStorageService service = new MinioMediaStorageService(new MediaStorageProperties(
      "http://minio:9000",
      "http://media.example.com:9000",
      "rinana_minio",
      "rinana_minio_secret",
      "rinana-media",
      "us-east-1"
    ));

    MediaAccessUrl firstAccessUrl = service.createAccessUrl("rinana-media", "videos/demo.mp4");
    MediaAccessUrl secondAccessUrl = service.createAccessUrl("rinana-media", "videos/demo.mp4");

    assertThat(secondAccessUrl).isSameAs(firstAccessUrl);
  }
}
