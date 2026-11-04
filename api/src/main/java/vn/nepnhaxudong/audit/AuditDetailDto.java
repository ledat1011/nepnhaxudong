package vn.nepnhaxudong.audit;

import java.time.Instant;
import tools.jackson.databind.JsonNode;

/** One audit line with both snapshots as JSON objects ({@code null} when a side does not exist). */
public record AuditDetailDto(
    long id,
    String userDisplayName,
    String entityType,
    long entityId,
    AuditAction action,
    Instant createdAt,
    String label,
    boolean restorable,
    JsonNode before,
    JsonNode after) {}
