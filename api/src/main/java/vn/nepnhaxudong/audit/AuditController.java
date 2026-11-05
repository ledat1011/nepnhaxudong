package vn.nepnhaxudong.audit;

import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
import vn.nepnhaxudong.auth.AppUser;
import vn.nepnhaxudong.auth.AppUserRepository;
import vn.nepnhaxudong.auth.ProblemCodes;
import vn.nepnhaxudong.auth.SessionPrincipal;
import vn.nepnhaxudong.common.ApiException;

/**
 * The edit history in the admin area. Paths are relative to the context path {@code /api}. Account
 * lines ({@code app_user}) hold emails, roles and security states, so only an owner ("Chủ") sees
 * them: they are left out of a member's list, and their detail and restore answer 403.
 */
@RestController
@RequestMapping("/admin/audit")
public class AuditController {

  static final int PAGE_SIZE = 50;
  static final String ACCOUNT_TYPE = "app_user";
  static final String OWNER_ONLY = "Chỉ Chủ được xem thay đổi tài khoản.";

  private final AuditLogRepository lines;
  private final AuditRestoreService restoreService;
  private final AppUserRepository users;
  private final JsonMapper json;

  public AuditController(
      AuditLogRepository lines,
      AuditRestoreService restoreService,
      AppUserRepository users,
      JsonMapper json) {
    this.lines = lines;
    this.restoreService = restoreService;
    this.users = users;
    this.json = json;
  }

  /** Newest first, 50 lines per page, pages count from 0. Both filters are optional. */
  @GetMapping
  public List<AuditEntryDto> list(
      @AuthenticationPrincipal SessionPrincipal principal,
      @RequestParam(required = false) String entityType,
      @RequestParam(required = false) Long entityId,
      @RequestParam(defaultValue = "0") int page) {
    if (page < 0) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Số trang không hợp lệ.");
    }
    String type = entityType == null || entityType.isBlank() ? null : entityType;
    String hidden = isOwner(principal) ? null : ACCOUNT_TYPE;
    return lines.search(type, entityId, hidden, PageRequest.of(page, PAGE_SIZE)).stream()
        .map(this::toEntry)
        .toList();
  }

  /** One line with both snapshots as JSON objects. Account secrets are never part of the answer. */
  @GetMapping("/{id}")
  public AuditDetailDto detail(
      @AuthenticationPrincipal SessionPrincipal principal, @PathVariable long id) {
    AuditRow row =
        lines
            .findRow(id)
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, AuditRestoreService.NOT_FOUND));
    requireVisible(principal, row);
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
  public void restore(@AuthenticationPrincipal SessionPrincipal principal, @PathVariable long id) {
    lines.findRow(id).ifPresent(row -> requireVisible(principal, row));
    restoreService.restore(id);
  }

  /** An account line is for owners only. */
  private void requireVisible(SessionPrincipal principal, AuditRow row) {
    if (ACCOUNT_TYPE.equals(row.entityType()) && !isOwner(principal)) {
      throw new ApiException(HttpStatus.FORBIDDEN, OWNER_ONLY, ProblemCodes.OWNER_REQUIRED);
    }
  }

  /** Read from the database on each request, so a demotion takes effect at once. */
  private boolean isOwner(SessionPrincipal principal) {
    return principal != null
        && users.findById(principal.userId()).filter(AppUser::isEnabled).map(AppUser::isOwner).orElse(false);
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
