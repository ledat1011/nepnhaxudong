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
import vn.nepnhaxudong.common.ApiException;

/** The edit history in the admin area. Paths are relative to the context path {@code /api}. */
@RestController
@RequestMapping("/admin/audit")
public class AuditController {

  static final int PAGE_SIZE = 50;

  private final AuditLogRepository lines;
  private final AuditRestoreService restoreService;

  public AuditController(AuditLogRepository lines, AuditRestoreService restoreService) {
    this.lines = lines;
    this.restoreService = restoreService;
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
    return lines.search(type, entityId, PageRequest.of(page, PAGE_SIZE));
  }

  @PostMapping("/{id}/restore")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void restore(@PathVariable long id) {
    restoreService.restore(id);
  }
}
