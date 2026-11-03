package vn.nepnhaxudong.audit;

import java.util.Optional;
import org.springframework.http.HttpStatus;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;
import vn.nepnhaxudong.common.ApiException;

/**
 * Base of the handlers: it turns the snapshot JSON into the admin DTO, so a subclass works with a
 * typed object. A snapshot that cannot be read is answered with 409, never with a server error.
 */
public abstract class JsonAuditedHandler<T> implements AuditedHandler {

  public static final String BAD_SNAPSHOT = "Không thể khôi phục: dữ liệu lịch sử không hợp lệ.";

  private final String entityType;
  private final Class<T> snapshotType;
  private final JsonMapper json;

  protected JsonAuditedHandler(String entityType, Class<T> snapshotType, JsonMapper json) {
    this.entityType = entityType;
    this.snapshotType = snapshotType;
    this.json = json;
  }

  @Override
  public String entityType() {
    return entityType;
  }

  @Override
  public Optional<Object> currentSnapshot(long entityId) {
    return find(entityId).map(Object.class::cast);
  }

  @Override
  public void restore(long entityId, String snapshotJson) {
    T snapshot;
    try {
      snapshot = json.readValue(snapshotJson, snapshotType);
    } catch (JacksonException e) {
      throw badSnapshot();
    }
    if (snapshot == null) {
      throw badSnapshot();
    }
    restore(entityId, snapshot);
  }

  /** The current admin DTO of the entity, or empty when it does not exist. */
  protected abstract Optional<T> find(long entityId);

  /** Checks the snapshot, then puts the entity back (creating it with the same id when needed). */
  protected abstract void restore(long entityId, T snapshot);

  protected static ApiException badSnapshot() {
    return new ApiException(HttpStatus.CONFLICT, BAD_SNAPSHOT);
  }
}
