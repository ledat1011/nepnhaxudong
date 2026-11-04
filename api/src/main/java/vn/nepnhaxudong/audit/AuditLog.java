package vn.nepnhaxudong.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * One line of the audit log. The two JSON columns hold the admin DTO of the entity, as JSON text,
 * before and after the change. A line is never changed after it is written.
 */
@Entity
@Table(name = "audit_log")
public class AuditLog {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  /** Null when the change has no user (a system call) or the user was deleted later. */
  @Column(name = "user_id")
  private Long userId;

  @Column(name = "entity_type", nullable = false)
  private String entityType;

  @Column(name = "entity_id", nullable = false)
  private long entityId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private AuditAction action;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "before_json")
  private String beforeJson;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "after_json")
  private String afterJson;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected AuditLog() {}

  public static AuditLog create(
      Long userId,
      String entityType,
      long entityId,
      AuditAction action,
      String beforeJson,
      String afterJson,
      Instant createdAt) {
    var line = new AuditLog();
    line.userId = userId;
    line.entityType = entityType;
    line.entityId = entityId;
    line.action = action;
    line.beforeJson = beforeJson;
    line.afterJson = afterJson;
    line.createdAt = createdAt;
    return line;
  }

  public Long getId() {
    return id;
  }

  public Long getUserId() {
    return userId;
  }

  public String getEntityType() {
    return entityType;
  }

  public long getEntityId() {
    return entityId;
  }

  public AuditAction getAction() {
    return action;
  }

  public String getBeforeJson() {
    return beforeJson;
  }

  public String getAfterJson() {
    return afterJson;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
