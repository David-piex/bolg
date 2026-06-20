package com.rinana.media.account;

import com.rinana.media.auth.ApiException;
import com.rinana.media.auth.CurrentUserResolver;
import com.rinana.media.media.MediaAccessUrl;
import com.rinana.media.media.MediaStorageService;
import com.rinana.media.media.MediaType;
import com.rinana.media.media.StoredMediaObject;
import com.rinana.media.user.UserEntity;
import com.rinana.media.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;

@RestController
@RequestMapping("/api/account")
public class AccountController {
  private static final long AVATAR_LIMIT_BYTES = 10L * 1024L * 1024L;

  private final CurrentUserResolver currentUserResolver;
  private final MediaStorageService mediaStorageService;
  private final PasswordEncoder passwordEncoder;
  private final UserRepository userRepository;

  public AccountController(
    CurrentUserResolver currentUserResolver,
    MediaStorageService mediaStorageService,
    PasswordEncoder passwordEncoder,
    UserRepository userRepository
  ) {
    this.currentUserResolver = currentUserResolver;
    this.mediaStorageService = mediaStorageService;
    this.passwordEncoder = passwordEncoder;
    this.userRepository = userRepository;
  }

  @GetMapping("/profile")
  AccountProfileResponse profile(HttpServletRequest request) {
    return AccountProfileResponse.from(currentUserResolver.requireCurrentUser(request));
  }

  @PatchMapping("/password")
  @Transactional
  AccountProfileResponse changePassword(
    @Valid @RequestBody ChangePasswordRequest request,
    HttpServletRequest servletRequest
  ) {
    UserEntity user = currentUserResolver.requireCurrentUser(servletRequest);
    requirePassword(user, request.oldPassword());
    if (!request.newPassword().equals(request.confirmPassword())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "PASSWORD_CONFIRM_MISMATCH", "两次输入的新密码不一致");
    }
    user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    user.setUpdatedAt(Instant.now());
    return AccountProfileResponse.from(userRepository.saveUser(user));
  }

  @PatchMapping("/email")
  @Transactional
  AccountProfileResponse changeEmail(
    @Valid @RequestBody ChangeEmailRequest request,
    HttpServletRequest servletRequest
  ) {
    UserEntity user = currentUserResolver.requireCurrentUser(servletRequest);
    requirePassword(user, request.oldPassword());
    if (!request.newEmail().equalsIgnoreCase(request.confirmEmail())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "EMAIL_CONFIRM_MISMATCH", "两次输入的新邮箱不一致");
    }
    String nextEmail = request.newEmail().trim().toLowerCase();
    boolean takenByAnotherUser = userRepository.findByEmail(nextEmail)
      .map(existing -> !existing.getId().equals(user.getId()))
      .orElse(false);
    if (takenByAnotherUser) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "EMAIL_EXISTS", "邮箱已存在");
    }
    user.setEmail(nextEmail);
    user.setUpdatedAt(Instant.now());
    return AccountProfileResponse.from(userRepository.saveUser(user));
  }

  @PostMapping("/avatar")
  @Transactional
  AccountProfileResponse uploadAvatar(@RequestParam("file") MultipartFile file, HttpServletRequest request) {
    UserEntity user = currentUserResolver.requireCurrentUser(request);
    requireAvatarFile(file);
    StoredMediaObject stored = mediaStorageService.store(file, MediaType.IMAGE, "avatars");
    user.setAvatarUrl(stored.bucketName() + "/" + stored.objectKey());
    user.setUpdatedAt(Instant.now());
    return AccountProfileResponse.from(userRepository.saveUser(user));
  }

  @GetMapping("/avatar")
  ResponseEntity<Void> avatar(HttpServletRequest request) {
    UserEntity user = currentUserResolver.requireCurrentUser(request);
    if (user.getAvatarUrl() == null || user.getAvatarUrl().isBlank()) {
      throw new ApiException(HttpStatus.NOT_FOUND, "AVATAR_NOT_FOUND", "头像不存在");
    }

    StoredAvatar storedAvatar = StoredAvatar.parse(user.getAvatarUrl());
    MediaAccessUrl accessUrl = mediaStorageService.createAccessUrl(storedAvatar.bucketName(), storedAvatar.objectKey());
    return ResponseEntity.status(HttpStatus.FOUND)
      .header(HttpHeaders.LOCATION, accessUrl.url().toString())
      .build();
  }

  private void requirePassword(UserEntity user, String rawPassword) {
    if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "OLD_PASSWORD_INVALID", "原密码不正确");
    }
  }

  private void requireAvatarFile(MultipartFile file) {
    if (file.getSize() > AVATAR_LIMIT_BYTES) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "AVATAR_TOO_LARGE", "头像不能超过 10MB");
    }
    String contentType = file.getContentType();
    if (contentType == null || !contentType.startsWith("image/")) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_MEDIA_TYPE", "请选择图片文件");
    }
  }

  private record StoredAvatar(String bucketName, String objectKey) {
    static StoredAvatar parse(String value) {
      int slash = value.indexOf('/');
      if (slash <= 0 || slash == value.length() - 1) {
        throw new ApiException(HttpStatus.NOT_FOUND, "AVATAR_NOT_FOUND", "头像不存在");
      }
      return new StoredAvatar(value.substring(0, slash), value.substring(slash + 1));
    }
  }
}
