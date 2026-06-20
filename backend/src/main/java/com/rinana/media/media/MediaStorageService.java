package com.rinana.media.media;

import org.springframework.web.multipart.MultipartFile;

public interface MediaStorageService {
  String bucketName();

  StoredMediaObject store(MultipartFile file, MediaType mediaType, String objectPrefix);

  MediaAccessUrl createAccessUrl(String bucketName, String objectKey);

  MediaUploadUrl createUploadUrl(MediaType mediaType, String objectPrefix, String originalName, String mimeType);

  boolean objectExists(String bucketName, String objectKey, long expectedSizeBytes);
}
