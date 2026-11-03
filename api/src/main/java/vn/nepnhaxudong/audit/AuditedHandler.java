package vn.nepnhaxudong.audit;

import java.util.Optional;
import vn.nepnhaxudong.publish.ContentChangedEvent;

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

  /**
   * What the website must refresh after a successful restore; {@code before} and {@code after} are
   * the snapshots from {@link #currentSnapshot} taken before and after the restore (either can be
   * null). Most kinds only show up on the home page, so that is the default; a kind with pages of
   * its own overrides this.
   */
  default ContentChangedEvent changeEvent(Object before, Object after) {
    return ContentChangedEvent.home();
  }
}
