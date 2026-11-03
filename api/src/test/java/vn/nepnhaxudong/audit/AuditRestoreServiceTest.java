package vn.nepnhaxudong.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import vn.nepnhaxudong.common.ApiException;

/** The restore rules that a real race would be needed to show, tested with a stub handler. */
class AuditRestoreServiceTest {

  private final AuditLogRepository lines = mock(AuditLogRepository.class);
  private final AuditService audit = mock(AuditService.class);

  @Test
  void aDuplicateKeyFromTheReinsertIsAnsweredWith409NotAnError() {
    var line =
        AuditLog.create(
            1L, "thing", 5, AuditAction.DELETE, "{\"id\":5}", null, Instant.now());
    when(lines.findById(9L)).thenReturn(Optional.of(line));
    var handler =
        new AuditedHandler() {
          @Override
          public String entityType() {
            return "thing";
          }

          @Override
          public Optional<Object> currentSnapshot(long entityId) {
            return Optional.empty();
          }

          @Override
          public void restore(long entityId, String snapshotJson) {
            throw new DuplicateKeyException("another request created the same id");
          }
        };
    var service = new AuditRestoreService(lines, audit, List.of(handler));

    assertThatThrownBy(() -> service.restore(9L))
        .isInstanceOfSatisfying(
            ApiException.class,
            e -> {
              assertThat(e.getStatus()).isEqualTo(HttpStatus.CONFLICT);
              assertThat(e.getMessage())
                  .isEqualTo(
                      "Không thể khôi phục: nội dung vừa được thay đổi. Hãy tải lại và thử lại.");
            });
    verify(audit, never()).record(any(), org.mockito.ArgumentMatchers.anyLong(), any(), any(), any());
  }
}
