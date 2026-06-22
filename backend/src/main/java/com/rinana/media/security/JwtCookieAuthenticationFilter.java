package com.rinana.media.security;

import com.rinana.media.auth.ApiException;
import com.rinana.media.auth.CurrentUserResolver;
import com.rinana.media.user.UserEntity;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtCookieAuthenticationFilter extends OncePerRequestFilter {
  private final CurrentUserResolver currentUserResolver;

  public JwtCookieAuthenticationFilter(CurrentUserResolver currentUserResolver) {
    this.currentUserResolver = currentUserResolver;
  }

  @Override
  protected void doFilterInternal(
    HttpServletRequest request,
    HttpServletResponse response,
    FilterChain filterChain
  ) throws ServletException, IOException {
    if (SecurityContextHolder.getContext().getAuthentication() == null) {
      boolean shouldContinue = authenticateFromCookie(request, response);
      if (!shouldContinue) {
        return;
      }
    }
    filterChain.doFilter(request, response);
  }

  private boolean authenticateFromCookie(HttpServletRequest request, HttpServletResponse response) throws IOException {
    try {
      currentUserResolver.currentUser(request).ifPresent(this::setAuthentication);
      return true;
    } catch (ApiException exception) {
      SecurityContextHolder.clearContext();
      if (exception.getStatus().is4xxClientError() && exception.getStatus().value() == HttpServletResponse.SC_FORBIDDEN) {
        writeApiException(response, exception);
        return false;
      }
      return true;
    } catch (RuntimeException exception) {
      SecurityContextHolder.clearContext();
      return true;
    }
  }

  private void setAuthentication(UserEntity user) {
    var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
    var authentication = new UsernamePasswordAuthenticationToken(user.getId(), null, authorities);
    authentication.setDetails(user);
    SecurityContextHolder.getContext().setAuthentication(authentication);
  }

  private void writeApiException(HttpServletResponse response, ApiException exception) throws IOException {
    response.setStatus(exception.getStatus().value());
    response.setContentType("application/json");
    response.getWriter().write("{\"errorCode\":\"" + exception.getErrorCode() + "\",\"message\":\"" + exception.getMessage() + "\"}");
  }
}
