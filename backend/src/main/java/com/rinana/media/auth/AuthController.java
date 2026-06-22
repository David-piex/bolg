package com.rinana.media.auth;

import com.rinana.media.security.JwtService;
import com.rinana.media.user.UserEntity;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
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

  @GetMapping("/csrf")
  ResponseEntity<Void> csrf(CsrfToken csrfToken) {
    csrfToken.getToken();
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/register")
  ResponseEntity<AuthUserResponse> register(
    @Valid @RequestBody RegisterRequest request,
    HttpServletRequest servletRequest,
    HttpServletResponse response
  ) {
    UserEntity user = authService.register(request);
    setAuthCookies(servletRequest, response, user);
    return ResponseEntity.status(HttpStatus.CREATED).body(AuthUserResponse.from(user));
  }

  @PostMapping("/login")
  AuthUserResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest, HttpServletResponse response) {
    UserEntity user = authService.login(request);
    setAuthCookies(servletRequest, response, user);
    return AuthUserResponse.from(user);
  }

  @GetMapping("/me")
  AuthUserResponse me(HttpServletRequest request) {
    return AuthUserResponse.from(currentUserResolver.requireCurrentUser(request));
  }

  @PostMapping("/refresh")
  AuthUserResponse refresh(HttpServletRequest request, HttpServletResponse response) {
    String refreshToken = cookieValue(request, RefreshTokenService.REFRESH_COOKIE);
    try {
      UserEntity user = authService.requireUser(refreshTokenService.requireUserId(refreshToken));
      setAccessCookie(request, response, user);
      return AuthUserResponse.from(user);
    } catch (ApiException exception) {
      if ("USER_DISABLED".equals(exception.getErrorCode())) {
        refreshTokenService.revoke(refreshToken);
        clearCookie(request, response, CurrentUserResolver.ACCESS_COOKIE);
        clearCookie(request, response, RefreshTokenService.REFRESH_COOKIE);
      }
      throw exception;
    }
  }

  @PostMapping("/logout")
  ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
    String refreshToken = cookieValueOrNull(request, RefreshTokenService.REFRESH_COOKIE);
    refreshTokenService.revoke(refreshToken);
    clearCookie(request, response, CurrentUserResolver.ACCESS_COOKIE);
    clearCookie(request, response, RefreshTokenService.REFRESH_COOKIE);
    return ResponseEntity.noContent().build();
  }

  private void setAuthCookies(HttpServletRequest request, HttpServletResponse response, UserEntity user) {
    setAccessCookie(request, response, user);
    setRefreshCookie(request, response, user);
  }

  private void setAccessCookie(HttpServletRequest request, HttpServletResponse response, UserEntity user) {
    response.addCookie(cookie(request, CurrentUserResolver.ACCESS_COOKIE, jwtService.createAccessToken(user.getId()), 15 * 60, true));
  }

  private void setRefreshCookie(HttpServletRequest request, HttpServletResponse response, UserEntity user) {
    response.addCookie(cookie(request, RefreshTokenService.REFRESH_COOKIE, refreshTokenService.create(user), refreshTokenService.cookieMaxAgeSeconds(), true));
  }

  private void clearCookie(HttpServletRequest request, HttpServletResponse response, String name) {
    response.addCookie(cookie(request, name, "", 0, true));
  }

  private Cookie cookie(HttpServletRequest request, String name, String value, int maxAgeSeconds, boolean httpOnly) {
    Cookie cookie = new Cookie(name, value);
    cookie.setHttpOnly(httpOnly);
    cookie.setPath("/");
    cookie.setMaxAge(maxAgeSeconds);
    cookie.setSecure(isSecureRequest(request));
    cookie.setAttribute("SameSite", "Lax");
    return cookie;
  }

  private boolean isSecureRequest(HttpServletRequest request) {
    return request.isSecure() || "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto"));
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
