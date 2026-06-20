package com.rinana.media.schema;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class FlywaySchemaTest {
  @Autowired
  JdbcTemplate jdbc;

  @Test
  void createsCoreTables() {
    assertThat(tableExists("users")).isTrue();
    assertThat(tableExists("invite_codes")).isTrue();
    assertThat(tableExists("media_assets")).isTrue();
    assertThat(tableExists("posts")).isTrue();
    assertThat(tableExists("post_media")).isTrue();
    assertThat(tableExists("albums")).isTrue();
    assertThat(tableExists("album_items")).isTrue();
    assertThat(tableExists("videos")).isTrue();
    assertThat(tableExists("admin_audit_logs")).isTrue();
  }

  private boolean tableExists(String tableName) {
    Integer count = jdbc.queryForObject(
      "select count(*) from information_schema.tables where table_name = ?",
      Integer.class,
      tableName
    );
    return count != null && count > 0;
  }
}
