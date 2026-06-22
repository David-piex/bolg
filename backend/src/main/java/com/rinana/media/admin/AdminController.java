package com.rinana.media.admin;

import com.rinana.media.auth.ApiException;
import com.rinana.media.auth.CurrentUserResolver;
import com.rinana.media.common.Role;
import com.rinana.media.common.UserStatus;
import com.rinana.media.invite.InviteCodeEntity;
import com.rinana.media.invite.InviteCodeRepository;
import com.rinana.media.invite.InviteCodeStatus;
import com.rinana.media.user.UserEntity;
import com.rinana.media.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
  private final CurrentUserResolver currentUserResolver;
  private final AdminAuditService adminAuditService;
  private final InviteCodeRepository inviteCodeRepository;
  private final UserRepository userRepository;

  public AdminController(
    CurrentUserResolver currentUserResolver,
    AdminAuditService adminAuditService,
    InviteCodeRepository inviteCodeRepository,
    UserRepository userRepository
  ) {
    this.currentUserResolver = currentUserResolver;
    this.adminAuditService = adminAuditService;
    this.inviteCodeRepository = inviteCodeRepository;
    this.userRepository = userRepository;
  }

  @PostMapping("/invites")
  @Transactional
  ResponseEntity<InviteResponse> createInvite(
    @Valid @RequestBody CreateInviteRequest request,
    HttpServletRequest servletRequest
  ) {
    UserEntity admin = requireAdmin(servletRequest);
    InviteCodeEntity invite = new InviteCodeEntity();
    invite.setCode(request.code());
    invite.setInitialLevel(request.initialLevel());
    invite.setMaxUses(request.maxUses());
    invite.setUsedCount(0);
    invite.setExpiresAt(request.expiresAt());
    invite.setStatus(InviteCodeStatus.ACTIVE);
    invite.setCreatedBy(admin.getId());
    invite.setCreatedAt(Instant.now());
    InviteCodeEntity saved = inviteCodeRepository.save(invite);
    adminAuditService.record(
      admin,
      "CREATE_INVITE",
      "INVITE_CODE",
      saved.getId(),
      "{\"code\":\"" + saved.getCode() + "\",\"initialLevel\":\"" + saved.getInitialLevel() + "\"}"
    );
    return ResponseEntity.status(HttpStatus.CREATED).body(InviteResponse.from(saved));
  }

  @GetMapping("/invites")
  List<InviteResponse> listInvites(HttpServletRequest request) {
    requireAdmin(request);
    return inviteCodeRepository.findAll().stream()
      .map(InviteResponse::from)
      .toList();
  }

  @GetMapping("/users")
  AdminUserPageResponse listUsers(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "10") int size,
    @RequestParam(required = false) String q,
    HttpServletRequest request
  ) {
    requireAdmin(request);
    int safePage = Math.max(page, 0);
    int safeSize = Math.max(1, Math.min(size, 50));
    String query = q == null || q.isBlank() ? null : q.trim();
    var pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
    return AdminUserPageResponse.from(userRepository.findManageableUsers(query, pageable).map(AdminUserResponse::from));
  }

  @GetMapping("/audit-logs")
  AdminAuditLogPageResponse listAuditLogs(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size,
    HttpServletRequest request
  ) {
    requireAdmin(request);
    return adminAuditService.list(page, size);
  }

  @DeleteMapping("/invites/{id}")
  @Transactional
  ResponseEntity<Void> disableInvite(@PathVariable UUID id, HttpServletRequest request) {
    UserEntity admin = requireAdmin(request);
    InviteCodeEntity invite = inviteCodeRepository.findById(id)
      .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "INVITE_NOT_FOUND", "邀请码不存在"));
    invite.setStatus(InviteCodeStatus.DISABLED);
    inviteCodeRepository.save(invite);
    adminAuditService.record(admin, "DISABLE_INVITE", "INVITE_CODE", invite.getId(), "{\"code\":\"" + invite.getCode() + "\"}");
    return ResponseEntity.noContent().build();
  }

  @PatchMapping("/users/{id}")
  @Transactional
  AdminUserResponse updateUser(
    @PathVariable UUID id,
    @Valid @RequestBody UpdateUserRequest request,
    HttpServletRequest servletRequest
  ) {
    UserEntity admin = requireAdmin(servletRequest);
    UserEntity user = userRepository.findUserById(id)
      .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "用户不存在"));
    if (user.getRole() == Role.SUPER_ADMIN) {
      throw new ApiException(HttpStatus.FORBIDDEN, "SUPER_ADMIN_PROTECTED", "超级管理员不能在管理后台被修改");
    }
    user.setMemberLevel(request.memberLevel());
    user.setStatus(request.disabled() ? UserStatus.DISABLED : UserStatus.ACTIVE);
    user.setUpdatedAt(Instant.now());
    UserEntity saved = userRepository.saveUser(user);
    adminAuditService.record(
      admin,
      "UPDATE_USER",
      "USER",
      saved.getId(),
      "{\"memberLevel\":\"" + saved.getMemberLevel() + "\",\"status\":\"" + saved.getStatus() + "\"}"
    );
    return AdminUserResponse.from(saved);
  }

  private UserEntity requireAdmin(HttpServletRequest request) {
    UserEntity user = currentUserResolver.requireCurrentUser(request);
    if (user.getRole() != Role.ADMIN && user.getRole() != Role.SUPER_ADMIN) {
      throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_REQUIRED", "需要管理员权限");
    }
    return user;
  }
}
