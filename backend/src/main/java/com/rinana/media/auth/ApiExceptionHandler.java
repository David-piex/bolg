package com.rinana.media.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(ApiException.class)
  ResponseEntity<Map<String, String>> handleApiException(ApiException exception) {
    return ResponseEntity.status(exception.getStatus())
      .body(Map.of(
        "errorCode", exception.getErrorCode(),
        "message", exception.getMessage()
      ));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<Map<String, String>> handleValidation() {
    return ResponseEntity.badRequest()
      .body(Map.of(
        "errorCode", "VALIDATION_ERROR",
        "message", "Invalid request"
      ));
  }
}
