package com.rinana.media.security;

import com.rinana.media.common.ContentVisibility;
import com.rinana.media.common.MemberLevel;
import com.rinana.media.common.Role;

public final class VisibilityPolicy {
  private VisibilityPolicy() {
  }

  public static boolean canView(Role role, MemberLevel memberLevel, ContentVisibility visibility) {
    if (visibility == ContentVisibility.PUBLIC) {
      return true;
    }

    if (role == Role.ADMIN || role == Role.SUPER_ADMIN) {
      return true;
    }

    return levelRank(memberLevel) >= visibilityRank(visibility);
  }

  private static int levelRank(MemberLevel level) {
    return switch (level) {
      case NORMAL -> 1;
      case GOLD -> 2;
      case DIAMOND -> 3;
    };
  }

  private static int visibilityRank(ContentVisibility visibility) {
    return switch (visibility) {
      case PUBLIC -> 0;
      case NORMAL -> 1;
      case GOLD -> 2;
      case DIAMOND -> 3;
    };
  }
}
