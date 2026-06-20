package com.rinana.media.media;

import io.minio.BucketExistsArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.http.Method;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class MinioMediaStorageService implements MediaStorageService {
  private static final int ACCESS_URL_MINUTES = 15;

  private final MinioClient storageClient;
  private final MinioClient accessClient;
  private final MediaStorageProperties properties;

  public MinioMediaStorageService(MediaStorageProperties properties) {
    this.properties = properties;
    this.storageClient = MinioClient.builder()
      .endpoint(properties.endpoint())
      .credentials(properties.accessKey(), properties.secretKey())
      .region(properties.region())
      .build();
    this.accessClient = MinioClient.builder()
      .endpoint(properties.accessEndpoint())
      .credentials(properties.accessKey(), properties.secretKey())
      .region(properties.region())
      .build();
  }

  @Override
  public StoredMediaObject store(MultipartFile file, MediaType mediaType, String objectPrefix) {
    String extension = extensionFrom(file.getOriginalFilename());
    String objectKey = objectPrefix + "/" + UUID.randomUUID() + extension;
    try {
      ensureBucketExists();
      storageClient.putObject(PutObjectArgs.builder()
        .bucket(properties.bucket())
        .object(objectKey)
        .contentType(file.getContentType())
        .stream(file.getInputStream(), file.getSize(), -1)
        .build());
      return new StoredMediaObject(properties.bucket(), objectKey);
    } catch (Exception exception) {
      throw new IllegalStateException("Media upload failed", exception);
    }
  }

  @Override
  public MediaAccessUrl createAccessUrl(String bucketName, String objectKey) {
    try {
      String url = accessClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
        .method(Method.GET)
        .bucket(bucketName)
        .object(objectKey)
        .expiry(ACCESS_URL_MINUTES, TimeUnit.MINUTES)
        .build());
      return new MediaAccessUrl(java.net.URI.create(url), Instant.now().plusSeconds(ACCESS_URL_MINUTES * 60L));
    } catch (Exception exception) {
      throw new IllegalStateException("Media access URL creation failed", exception);
    }
  }

  private String extensionFrom(String filename) {
    if (filename == null) {
      return "";
    }
    int dot = filename.lastIndexOf('.');
    return dot >= 0 ? filename.substring(dot) : "";
  }

  private void ensureBucketExists() throws Exception {
    boolean exists = storageClient.bucketExists(BucketExistsArgs.builder()
      .bucket(properties.bucket())
      .build());
    if (!exists) {
      storageClient.makeBucket(MakeBucketArgs.builder()
        .bucket(properties.bucket())
        .build());
    }
  }
}
