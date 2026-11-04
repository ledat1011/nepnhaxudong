package vn.nepnhaxudong.audit;

import java.time.Instant;

/** One line of the audit list. The JSON snapshots are not part of it. */
public record AuditEntryDto(
    long id,
    String userDisplayName,
    String entityType,
    long entityId,
    AuditAction action,
    Instant createdAt) {}
