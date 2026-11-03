package vn.nepnhaxudong.audit;

import java.util.Optional;

/**
 * Knows how to read and restore one kind of audited content. Every kind has one bean; the restore
 * service finds the bean by {@link #entityType()}, so a new kind needs only a new bean.
 */
public interface AuditedHandler {

  /** The value stored in {@code audit_log.entity_type}. */
  String entityType();

  /**
   * The entity as the admin DTO that the audit log stores, or empty when it does not exist. It is
   * the "before" and "after" of the restore line.
   */
  Optional<Object> currentSnapshot(long entityId);

  /**
   * Puts the entity back to the snapshot (the JSON of the admin DTO). When the entity does not
   * exist it is created again with the same id and its child rows. It must check the whole
   * snapshot before it writes anything, and it answers 409 when it cannot restore.
   */
  void restore(long entityId, String snapshotJson);
}
