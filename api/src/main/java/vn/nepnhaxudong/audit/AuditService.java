package vn.nepnhaxudong.audit;

/** Records who changed what. A write service calls it inside its own transaction. */
public interface AuditService {

  /**
   * @param before the entity as it was before the change, or {@code null} when it did not exist
   * @param after the entity as it is after the change, or {@code null} when it was deleted
   */
  void record(String entityType, long entityId, AuditAction action, Object before, Object after);
}
