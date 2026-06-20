package com.rinana.media.media;

import org.springframework.web.multipart.MultipartFile;

public interface MediaStorageService {
  StoredMediaObject store(MultipartFile file, MediaType mediaType, String objectPrefix);

  MediaAccessUrl createAccessUrl(String bucketName, String objectKey);
}
