package vn.nepnhaxudong.audit;

/** What happened to an audited entity. The names are stored in {@code audit_log.action}. */
public enum AuditAction {
  CREATE,
  UPDATE,
  DELETE,
  RESTORE
}
