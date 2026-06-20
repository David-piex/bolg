package com.rinana.media.auth;

import com.rinana.media.security.JwtService;
import com.rinana.media.user.UserEntity;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Optional;

@Component
public class CurrentUserResolver {
  public static final String ACCESS_COOKIE = "rinana_access_token";

  private final AuthService authService;
  private final JwtService jwtService;

  public CurrentUserResolver(AuthService authService, JwtService jwtService) {
    this.authService = authService;
    this.jwtService = jwtService;
  }

  public UserEntity requireCurrentUser(HttpServletRequest request) {
    return currentUser(request)
      .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "请先登录"));
  }

  public Optional<UserEntity> currentUser(HttpServletRequest request) {
    String token = Arrays.stream(request.getCookies() == null ? new Cookie[0] : request.getCookies())
      .filter(cookie -> ACCESS_COOKIE.equals(cookie.getName()))
      .findFirst()
      .map(Cookie::getValue)
      .orElse(null);
    if (token == null || token.isBlank()) {
      return Optional.empty();
    }
    return Optional.of(authService.requireUser(jwtService.parseUserId(token)));
  }
}
