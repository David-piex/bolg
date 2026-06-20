package com.rinana.media.admin;

import com.rinana.media.user.UserEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
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

  public AdminAuditLogPageResponse list(int page, int size) {
    int safePage = Math.max(page, 0);
    int safeSize = Math.max(1, Math.min(size, 50));
    long total = jdbcTemplate.queryForObject("select count(*) from admin_audit_logs", Long.class);
    List<AdminAuditLogResponse> items = jdbcTemplate.query(
      """
        select audit.id,
               audit.admin_user_id,
               audit.action_type,
               audit.target_type,
               audit.target_id,
               audit.detail_json,
               audit.created_at,
               admin_user.username as admin_username,
               admin_user.display_name as admin_display_name
        from admin_audit_logs audit
        join users admin_user on admin_user.id = audit.admin_user_id
        order by audit.created_at desc
        limit ? offset ?
        """,
      (rs, rowNum) -> new AdminAuditLogResponse(
        rs.getObject("id", UUID.class),
        rs.getObject("admin_user_id", UUID.class),
        rs.getString("admin_username"),
        rs.getString("admin_display_name"),
        rs.getString("action_type"),
        rs.getString("target_type"),
        rs.getObject("target_id", UUID.class),
        rs.getString("detail_json"),
        rs.getTimestamp("created_at").toInstant()
      ),
      safeSize,
      safePage * safeSize
    );

    return AdminAuditLogPageResponse.of(items, safePage, safeSize, total);
  }
}
