package vn.nepnhaxudong.audit;

import java.time.Instant;

/** An audit line joined with the user name, as the repository reads it, with the JSON as text. */
public record AuditRow(
    long id,
    String userDisplayName,
    String entityType,
    long entityId,
    AuditAction action,
    Instant createdAt,
    String beforeJson,
    String afterJson) {}
