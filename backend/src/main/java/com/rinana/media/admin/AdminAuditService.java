package com.rinana.media.admin;

import com.rinana.media.user.UserEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

@Service
public class AdminAuditService {
  private final JdbcTemplate jdbcTemplate;

  public AdminAuditService(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public void record(UserEntity admin, String actionType, String targetType, UUID targetId, String detailJson) {
    jdbcTemplate.update(
      """
        insert into admin_audit_logs (id, admin_user_id, action_type, target_type, target_id, detail_json, created_at)
        values (?, ?, ?, ?, ?, ?, ?)
        """,
      UUID.randomUUID(),
      admin.getId(),
      actionType,
      targetType,
      targetId,
      detailJson,
      Timestamp.from(Instant.now())
    );
  }
}
