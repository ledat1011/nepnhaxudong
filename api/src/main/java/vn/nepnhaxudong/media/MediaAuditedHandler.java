package vn.nepnhaxudong.media;

import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import vn.nepnhaxudong.audit.AuditedHandler;
import vn.nepnhaxudong.common.ApiException;

/**
 * Media is not restorable from the audit log: the image file is deleted for good, and a row without
 * its file would be a broken image, and the old alt texts are better changed by hand. This handler
 * only exists to answer a restore request with a clear 409 instead of the generic "unknown type"
 * message.
 */
@Component
public class MediaAuditedHandler implements AuditedHandler {

  static final String DELETED = "Ảnh đã xóa không khôi phục được. Hãy tải ảnh lên lại.";
  static final String CHANGE_NOT_RESTORABLE =
      "Không khôi phục được thay đổi của ảnh. Hãy sửa lại chữ mô tả.";

  private final MediaRepository media;

  public MediaAuditedHandler(MediaRepository media) {
    this.media = media;
  }

  @Override
  public String entityType() {
    return MediaService.AUDIT_TYPE;
  }

  @Override
  public Optional<Object> currentSnapshot(long entityId) {
    return media.findById(entityId).map(MediaAdminDto::from);
  }

  @Override
  public void restore(long entityId, String snapshotJson) {
    // An image that still exists had only its alt texts changed; one that is gone was deleted.
    String detail = media.existsById(entityId) ? CHANGE_NOT_RESTORABLE : DELETED;
    throw new ApiException(HttpStatus.CONFLICT, detail);
  }
}
