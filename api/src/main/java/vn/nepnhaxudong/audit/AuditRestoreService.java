package vn.nepnhaxudong.audit;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nepnhaxudong.common.ApiException;

/**
 * Restores content from a line of the audit log. The whole restore is one transaction: when a check
 * fails, nothing is written, not even the RESTORE line.
 */
@Service
public class AuditRestoreService {

  static final String CREATE_MESSAGE = "Không thể khôi phục bản tạo mới; hãy xóa nội dung.";
  static final String CHANGED_MEANWHILE =
      "Không thể khôi phục: nội dung vừa được thay đổi. Hãy tải lại và thử lại.";
  static final String UNSUPPORTED = "Không thể khôi phục loại nội dung này.";
  static final String NOT_FOUND = "Không tìm thấy dòng lịch sử.";

  private final AuditLogRepository lines;
  private final AuditService audit;
  private final ApplicationEventPublisher events;
  private final Map<String, AuditedHandler> handlers = new HashMap<>();

  public AuditRestoreService(
      AuditLogRepository lines,
      AuditService audit,
      ApplicationEventPublisher events,
      List<AuditedHandler> handlerBeans) {
    this.lines = lines;
    this.audit = audit;
    this.events = events;
    for (AuditedHandler handler : handlerBeans) {
      if (handlers.put(handler.entityType(), handler) != null) {
        throw new IllegalStateException(
            "Two audit handlers for the entity type " + handler.entityType());
      }
    }
  }

  @Transactional
  public void restore(long auditId) {
    AuditLog line =
        lines
            .findById(auditId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, NOT_FOUND));
    // A CREATE line, and a RESTORE line that made the content again, have no earlier state.
    if (line.getBeforeJson() == null) {
      throw new ApiException(HttpStatus.CONFLICT, CREATE_MESSAGE);
    }
    AuditedHandler handler = handlers.get(line.getEntityType());
    if (handler == null) {
      throw new ApiException(HttpStatus.CONFLICT, UNSUPPORTED);
    }
    long entityId = line.getEntityId();
    Object current = handler.currentSnapshot(entityId).orElse(null);
    // The state of the line is always rebuilt: a deleted entity is created again with its old id,
    // an existing one is overwritten. The RESTORE line keeps what was overwritten, so a restore can
    // itself be restored.
    try {
      handler.restore(entityId, line.getBeforeJson());
      // Send the inserts now, so that a clash with a parallel restore shows up here.
      lines.flush();
    } catch (DataIntegrityViolationException e) {
      throw new ApiException(HttpStatus.CONFLICT, CHANGED_MEANWHILE);
    }
    Object restored = handler.currentSnapshot(entityId).orElse(null);
    audit.record(line.getEntityType(), entityId, AuditAction.RESTORE, current, restored);
    // The same event as a normal write of this kind sends; it goes out after the commit.
    events.publishEvent(handler.changeEvent(current, restored));
  }
}
