package vn.nepnhaxudong.audit;

import java.time.Instant;

/**
 * One line of the audit list. The JSON snapshots are not part of it; {@code label} is a short name
 * of the content taken from them, and {@code restorable} tells whether the restore button works.
 */
public record AuditEntryDto(
    long id,
    String userDisplayName,
    String entityType,
    long entityId,
    AuditAction action,
    Instant createdAt,
    String label,
    boolean restorable) {}
