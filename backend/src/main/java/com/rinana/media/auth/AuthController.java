package com.rinana.media.auth;

import com.rinana.media.common.UserStatus;
import com.rinana.media.security.JwtService;
import com.rinana.media.user.UserEntity;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthService authService;
  private final JwtService jwtService;
  private final CurrentUserResolver currentUserResolver;
  private final RefreshTokenService refreshTokenService;

  public AuthController(
    AuthService authService,
    JwtService jwtService,
    CurrentUserResolver currentUserResolver,
    RefreshTokenService refreshTokenService
  ) {
    this.authService = authService;
    this.jwtService = jwtService;
    this.currentUserResolver = currentUserResolver;
    this.refreshTokenService = refreshTokenService;
  }

  @PostMapping("/register")
  ResponseEntity<AuthUserResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletResponse response) {
    UserEntity user = authService.register(request);
    setAccessCookie(response, user);
    setRefreshCookie(response, user);
    return ResponseEntity.status(HttpStatus.CREATED).body(AuthUserResponse.from(user));
  }

  @PostMapping("/login")
  AuthUserResponse login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
    UserEntity user = authService.login(request);
    setAccessCookie(response, user);
    setRefreshCookie(response, user);
    return AuthUserResponse.from(user);
  }

  @GetMapping("/me")
  AuthUserResponse me(HttpServletRequest request) {
    return AuthUserResponse.from(currentUserResolver.requireCurrentUser(request));
  }

  @PostMapping("/refresh")
  AuthUserResponse refresh(HttpServletRequest request, HttpServletResponse response) {
    String refreshToken = cookieValue(request, RefreshTokenService.REFRESH_COOKIE);
    UserEntity user = authService.requireUser(refreshTokenService.requireUserId(refreshToken));
    if (user.getStatus() == UserStatus.DISABLED) {
      refreshTokenService.revoke(refreshToken);
      clearCookie(response, RefreshTokenService.REFRESH_COOKIE);
      throw new ApiException(HttpStatus.FORBIDDEN, "USER_DISABLED", "账号已被禁用");
    }
    setAccessCookie(response, user);
    return AuthUserResponse.from(user);
  }

  @PostMapping("/logout")
  ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
    String refreshToken = cookieValueOrNull(request, RefreshTokenService.REFRESH_COOKIE);
    refreshTokenService.revoke(refreshToken);
    clearCookie(response, CurrentUserResolver.ACCESS_COOKIE);
    clearCookie(response, RefreshTokenService.REFRESH_COOKIE);
    return ResponseEntity.noContent().build();
  }

  private void setAccessCookie(HttpServletResponse response, UserEntity user) {
    Cookie cookie = new Cookie(CurrentUserResolver.ACCESS_COOKIE, jwtService.createAccessToken(user.getId()));
    cookie.setHttpOnly(true);
    cookie.setPath("/");
    cookie.setMaxAge(15 * 60);
    response.addCookie(cookie);
  }

  private void setRefreshCookie(HttpServletResponse response, UserEntity user) {
    Cookie cookie = new Cookie(RefreshTokenService.REFRESH_COOKIE, refreshTokenService.create(user));
    cookie.setHttpOnly(true);
    cookie.setPath("/");
    cookie.setMaxAge(refreshTokenService.cookieMaxAgeSeconds());
    response.addCookie(cookie);
  }

  private void clearCookie(HttpServletResponse response, String name) {
    Cookie cookie = new Cookie(name, "");
    cookie.setHttpOnly(true);
    cookie.setPath("/");
    cookie.setMaxAge(0);
    response.addCookie(cookie);
  }

  private String cookieValue(HttpServletRequest request, String name) {
    String value = cookieValueOrNull(request, name);
    if (value == null || value.isBlank()) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "请先登录");
    }
    return value;
  }

  private String cookieValueOrNull(HttpServletRequest request, String name) {
    if (request.getCookies() == null) {
      return null;
    }
    for (Cookie cookie : request.getCookies()) {
      if (name.equals(cookie.getName())) {
        return cookie.getValue();
      }
    }
    return null;
  }
}
