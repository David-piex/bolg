package com.rinana.media.admin;

import com.rinana.media.common.MemberLevel;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateInviteRequest(
  @NotBlank @Size(max = 64) String code,
  @NotNull MemberLevel initialLevel,
  @Min(1) @Max(999) int maxUses
) {
}
