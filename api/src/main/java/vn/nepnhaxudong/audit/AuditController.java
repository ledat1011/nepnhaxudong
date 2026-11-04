package vn.nepnhaxudong.audit;

import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;
import vn.nepnhaxudong.common.ApiException;

/** The edit history in the admin area. Paths are relative to the context path {@code /api}. */
@RestController
@RequestMapping("/admin/audit")
public class AuditController {

  static final int PAGE_SIZE = 50;

  private final AuditLogRepository lines;
  private final AuditRestoreService restoreService;
  private final JsonMapper json;

  public AuditController(
      AuditLogRepository lines, AuditRestoreService restoreService, JsonMapper json) {
    this.lines = lines;
    this.restoreService = restoreService;
    this.json = json;
  }

  /** Newest first, 50 lines per page, pages count from 0. Both filters are optional. */
  @GetMapping
  public List<AuditEntryDto> list(
      @RequestParam(required = false) String entityType,
      @RequestParam(required = false) Long entityId,
      @RequestParam(defaultValue = "0") int page) {
    if (page < 0) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Số trang không hợp lệ.");
    }
    String type = entityType == null || entityType.isBlank() ? null : entityType;
    return lines.search(type, entityId, PageRequest.of(page, PAGE_SIZE)).stream()
        .map(this::toEntry)
        .toList();
  }

  /** One line with both snapshots as JSON objects. Account secrets are never part of the answer. */
  @GetMapping("/{id}")
  public AuditDetailDto detail(@PathVariable long id) {
    AuditRow row =
        lines
            .findRow(id)
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, AuditRestoreService.NOT_FOUND));
    JsonNode before = withoutSecrets(parse(row.beforeJson()));
    JsonNode after = withoutSecrets(parse(row.afterJson()));
    return new AuditDetailDto(
        row.id(),
        row.userDisplayName(),
        row.entityType(),
        row.entityId(),
        row.action(),
        row.createdAt(),
        AuditLabels.label(row.entityType(), row.entityId(), before, after),
        isRestorable(row),
        before,
        after);
  }

  @PostMapping("/{id}/restore")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void restore(@PathVariable long id) {
    restoreService.restore(id);
  }

  private AuditEntryDto toEntry(AuditRow row) {
    String label =
        AuditLabels.label(
            row.entityType(), row.entityId(), parse(row.beforeJson()), parse(row.afterJson()));
    return new AuditEntryDto(
        row.id(),
        row.userDisplayName(),
        row.entityType(),
        row.entityId(),
        row.action(),
        row.createdAt(),
        label,
        isRestorable(row));
  }

  /** A create line has nothing to go back to; the kind must also have a handler that can restore. */
  private boolean isRestorable(AuditRow row) {
    return row.action() != AuditAction.CREATE
        && row.beforeJson() != null
        && restoreService.canRestore(row.entityType());
  }

  private JsonNode parse(String text) {
    return text == null ? null : json.readTree(text);
  }

  private static JsonNode withoutSecrets(JsonNode snapshot) {
    if (snapshot instanceof ObjectNode object) {
      object.remove("passwordHash");
      object.remove("totpSecret");
    }
    return snapshot;
  }
}
