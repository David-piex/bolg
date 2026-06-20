package com.rinana.media.security;

import com.rinana.media.common.ContentVisibility;
import com.rinana.media.common.MemberLevel;
import com.rinana.media.common.Role;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class VisibilityPolicyTest {
  @Test
  void adminRolesCanSeeEveryMembershipContent() {
    assertThat(VisibilityPolicy.canView(Role.ADMIN, MemberLevel.NORMAL, ContentVisibility.DIAMOND)).isTrue();
    assertThat(VisibilityPolicy.canView(Role.SUPER_ADMIN, MemberLevel.NORMAL, ContentVisibility.DIAMOND)).isTrue();
  }

  @Test
  void diamondCanSeeDiamondGoldNormalAndPublicContent() {
    assertThat(VisibilityPolicy.canView(Role.USER, MemberLevel.DIAMOND, ContentVisibility.DIAMOND)).isTrue();
    assertThat(VisibilityPolicy.canView(Role.USER, MemberLevel.DIAMOND, ContentVisibility.GOLD)).isTrue();
    assertThat(VisibilityPolicy.canView(Role.USER, MemberLevel.DIAMOND, ContentVisibility.NORMAL)).isTrue();
    assertThat(VisibilityPolicy.canView(Role.USER, MemberLevel.DIAMOND, ContentVisibility.PUBLIC)).isTrue();
  }

  @Test
  void goldCannotSeeDiamondContent() {
    assertThat(VisibilityPolicy.canView(Role.USER, MemberLevel.GOLD, ContentVisibility.GOLD)).isTrue();
    assertThat(VisibilityPolicy.canView(Role.USER, MemberLevel.GOLD, ContentVisibility.DIAMOND)).isFalse();
  }

  @Test
  void normalCannotSeeGoldOrDiamondContent() {
    assertThat(VisibilityPolicy.canView(Role.USER, MemberLevel.NORMAL, ContentVisibility.GOLD)).isFalse();
    assertThat(VisibilityPolicy.canView(Role.USER, MemberLevel.NORMAL, ContentVisibility.DIAMOND)).isFalse();
  }

  @Test
  void publicContentIsAlwaysVisible() {
    assertThat(VisibilityPolicy.canView(Role.USER, MemberLevel.NORMAL, ContentVisibility.PUBLIC)).isTrue();
  }
}
