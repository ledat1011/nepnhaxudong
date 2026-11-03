package vn.nepnhaxudong.audit;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
  static final String DELETED_LATER =
      "Không thể khôi phục: nội dung đã bị xóa. Hãy khôi phục bản xóa trước.";
  static final String STILL_EXISTS = "Không thể khôi phục: nội dung vẫn còn.";
  static final String UNSUPPORTED = "Không thể khôi phục loại nội dung này.";
  static final String NOT_FOUND = "Không tìm thấy dòng lịch sử.";

  private final AuditLogRepository lines;
  private final AuditService audit;
  private final Map<String, AuditedHandler> handlers = new HashMap<>();

  public AuditRestoreService(
      AuditLogRepository lines, AuditService audit, List<AuditedHandler> handlerBeans) {
    this.lines = lines;
    this.audit = audit;
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
    if (line.getAction() == AuditAction.DELETE) {
      if (current != null) {
        throw new ApiException(HttpStatus.CONFLICT, STILL_EXISTS);
      }
    } else if (current == null) {
      throw new ApiException(HttpStatus.CONFLICT, DELETED_LATER);
    }
    handler.restore(entityId, line.getBeforeJson());
    Object restored = handler.currentSnapshot(entityId).orElse(null);
    audit.record(line.getEntityType(), entityId, AuditAction.RESTORE, current, restored);
  }
}
