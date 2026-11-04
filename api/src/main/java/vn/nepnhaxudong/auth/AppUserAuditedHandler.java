package vn.nepnhaxudong.auth;

import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import vn.nepnhaxudong.audit.AuditedHandler;
import vn.nepnhaxudong.common.ApiException;

/**
 * Account changes are not restorable from the audit log: a restore would bring back an old state of
 * a password reset, a lock or a two-factor setting, which is a security risk. This handler only
 * exists to answer a restore request with a clear 409 instead of the generic "unknown type"
 * message. It must never write.
 */
@Component
public class AppUserAuditedHandler implements AuditedHandler {

  static final String ENTITY_TYPE = "app_user";
  static final String NOT_RESTORABLE = "Không thể khôi phục thay đổi tài khoản.";

  private final AppUserRepository users;

  public AppUserAuditedHandler(AppUserRepository users) {
    this.users = users;
  }

  @Override
  public String entityType() {
    return ENTITY_TYPE;
  }

  @Override
  public Optional<Object> currentSnapshot(long entityId) {
    return users.findById(entityId).map(UserSummary::of);
  }

  @Override
  public void restore(long entityId, String snapshotJson) {
    throw new ApiException(HttpStatus.CONFLICT, NOT_RESTORABLE);
  }
}
