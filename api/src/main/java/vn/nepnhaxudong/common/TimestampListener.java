package vn.nepnhaxudong.common;

import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import java.time.Clock;
import org.springframework.stereotype.Component;

/**
 * JPA entity listener that sets the timestamps of a {@link TimestampedEntity}. It is a Spring bean
 * (Hibernate creates listeners through Spring's bean container), so it gets the {@code Clock} bean
 * by constructor injection and tests can control time.
 */
@Component
public class TimestampListener {

  private final Clock clock;

  public TimestampListener(Clock clock) {
    this.clock = clock;
  }

  @PrePersist
  void onCreate(TimestampedEntity entity) {
    entity.stampCreated(clock.instant());
  }

  @PreUpdate
  void onUpdate(TimestampedEntity entity) {
    entity.stampUpdated(clock.instant());
  }
}
