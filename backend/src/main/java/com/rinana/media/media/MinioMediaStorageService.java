package com.rinana.media.media;

import io.minio.BucketExistsArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.StatObjectArgs;
import io.minio.http.Method;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.TimeUnit;

@Service
public class MinioMediaStorageService implements MediaStorageService {
  private static final int ACCESS_URL_MINUTES = 15;
  private static final long ACCESS_URL_REFRESH_MARGIN_SECONDS = 60;
  private static final int UPLOAD_URL_MINUTES = 10;

  private final MinioClient storageClient;
  private final MinioClient accessClient;
  private final MediaStorageProperties properties;
  private final ConcurrentMap<String, MediaAccessUrl> accessUrlCache = new ConcurrentHashMap<>();

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
  public String bucketName() {
    return properties.bucket();
  }

  @Override
  public StoredMediaObject store(MultipartFile file, MediaType mediaType, String objectPrefix) {
    String objectKey = createObjectKey(objectPrefix, file.getOriginalFilename());
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
    String cacheKey = bucketName + "\n" + objectKey;
    Instant now = Instant.now();
    MediaAccessUrl cached = accessUrlCache.get(cacheKey);
    if (isReusableAccessUrl(cached, now)) {
      return cached;
    }

    return accessUrlCache.compute(cacheKey, (key, current) ->
      isReusableAccessUrl(current, Instant.now()) ? current : createUncachedAccessUrl(bucketName, objectKey)
    );
  }

  private MediaAccessUrl createUncachedAccessUrl(String bucketName, String objectKey) {
    try {
      Instant expiresAt = Instant.now().plusSeconds(ACCESS_URL_MINUTES * 60L);
      String url = accessClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
        .method(Method.GET)
        .bucket(bucketName)
        .object(objectKey)
        .expiry(ACCESS_URL_MINUTES, TimeUnit.MINUTES)
        .build());
      return new MediaAccessUrl(java.net.URI.create(url), expiresAt);
    } catch (Exception exception) {
      throw new IllegalStateException("Media access URL creation failed", exception);
    }
  }

  private boolean isReusableAccessUrl(MediaAccessUrl accessUrl, Instant now) {
    return accessUrl != null && accessUrl.expiresAt().isAfter(now.plusSeconds(ACCESS_URL_REFRESH_MARGIN_SECONDS));
  }

  @Override
  public MediaUploadUrl createUploadUrl(MediaType mediaType, String objectPrefix, String originalName, String mimeType) {
    String objectKey = createObjectKey(objectPrefix, originalName);
    try {
      ensureBucketExists();
      String url = accessClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
        .method(Method.PUT)
        .bucket(properties.bucket())
        .object(objectKey)
        .expiry(UPLOAD_URL_MINUTES, TimeUnit.MINUTES)
        .build());
      return new MediaUploadUrl(java.net.URI.create(url), properties.bucket(), objectKey, Instant.now().plusSeconds(UPLOAD_URL_MINUTES * 60L));
    } catch (Exception exception) {
      throw new IllegalStateException("Media upload URL creation failed", exception);
    }
  }

  @Override
  public boolean objectExists(String bucketName, String objectKey, long expectedSizeBytes) {
    try {
      long objectSize = storageClient.statObject(StatObjectArgs.builder()
        .bucket(bucketName)
        .object(objectKey)
        .build()).size();
      return expectedSizeBytes <= 0 || objectSize == expectedSizeBytes;
    } catch (Exception exception) {
      return false;
    }
  }

  @Override
  public void deleteObject(String bucketName, String objectKey) {
    try {
      storageClient.removeObject(RemoveObjectArgs.builder()
        .bucket(bucketName)
        .object(objectKey)
        .build());
      accessUrlCache.remove(bucketName + "\n" + objectKey);
    } catch (Exception exception) {
      throw new IllegalStateException("Media deletion failed", exception);
    }
  }

  private String createObjectKey(String objectPrefix, String filename) {
    return objectPrefix + "/" + UUID.randomUUID() + extensionFrom(filename);
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
