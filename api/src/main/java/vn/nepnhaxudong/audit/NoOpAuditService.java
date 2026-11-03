package vn.nepnhaxudong.audit;

import org.springframework.stereotype.Component;

/** Placeholder until the real audit service exists; it records nothing. */
@Component
public class NoOpAuditService implements AuditService {

  @Override
  public void record(
      String entityType, long entityId, AuditAction action, Object before, Object after) {
    // Intentionally empty: the audit log is written by the real service of a later task.
  }
}
