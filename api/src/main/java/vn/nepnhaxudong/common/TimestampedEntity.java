package vn.nepnhaxudong.common;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import java.time.Instant;

/**
 * Base class of every entity with created_at / updated_at columns. The database has no trigger, so
 * the values are set by {@link TimestampListener}, which reads the application {@code Clock}.
 */
@MappedSuperclass
@EntityListeners(TimestampListener.class)
public abstract class TimestampedEntity {

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  void stampCreated(Instant now) {
    this.createdAt = now;
    this.updatedAt = now;
  }

  void stampUpdated(Instant now) {
    this.updatedAt = now;
  }
}
