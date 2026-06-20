package com.rinana.media.account;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ChangeEmailRequest(
  @NotBlank String oldPassword,
  @NotBlank @Email String newEmail,
  @NotBlank @Email String confirmEmail
) {
}
