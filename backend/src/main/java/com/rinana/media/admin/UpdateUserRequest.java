package com.rinana.media.admin;

import com.rinana.media.common.MemberLevel;
import jakarta.validation.constraints.NotNull;

public record UpdateUserRequest(
  @NotNull MemberLevel memberLevel,
  boolean disabled
) {
}
