package vn.nepnhaxudong.timeline;

import java.sql.Timestamp;
import java.time.Clock;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;
import vn.nepnhaxudong.audit.JsonAuditedHandler;
import vn.nepnhaxudong.common.ApiException;
import vn.nepnhaxudong.media.MediaReferences;

/**
 * Reads and restores timeline events for the audit log. A deleted event is inserted again with its
 * old id; its translations and image links are then created through the normal entity code.
 */
@Component
class TimelineAuditedHandler extends JsonAuditedHandler<TimelineEventAdminDto> {

  private final TimelineEventRepository events;
  private final TimelineService service;
  private final MediaReferences mediaReferences;
  private final JdbcTemplate jdbc;
  private final Clock clock;

  TimelineAuditedHandler(
      TimelineEventRepository events,
      TimelineService service,
      MediaReferences mediaReferences,
      JdbcTemplate jdbc,
      Clock clock,
      JsonMapper json) {
    super(TimelineService.AUDIT_TYPE, TimelineEventAdminDto.class, json);
    this.events = events;
    this.service = service;
    this.mediaReferences = mediaReferences;
    this.jdbc = jdbc;
    this.clock = clock;
  }

  @Override
  protected Optional<TimelineEventAdminDto> find(long entityId) {
    return events.findById(entityId).map(TimelineEventAdminDto::from);
  }

  @Override
  protected void restore(long entityId, TimelineEventAdminDto snapshot) {
    if (snapshot.id() != entityId) {
      throw badSnapshot();
    }
    List<Long> mediaIds = snapshot.mediaIds();
    if (mediaIds.size() > TimelineEventRequest.MAX_IMAGES) {
      throw badSnapshot();
    }
    var seen = new HashSet<Long>();
    for (Long mediaId : mediaIds) {
      if (mediaId == null || !seen.add(mediaId)) {
        throw badSnapshot();
      }
    }
    var request =
        new TimelineEventRequest(
            snapshot.year(),
            snapshot.sortOrder(),
            snapshot.title(),
            snapshot.description(),
            mediaIds);
    try {
      service.validateContent(request);
    } catch (ApiException e) {
      throw badSnapshot();
    }
    mediaReferences.requireAllExist(mediaIds);
    TimelineEvent event =
        events.findById(entityId).orElseGet(() -> insertWithId(entityId, snapshot));
    service.apply(event, request, snapshot.sortOrder());
  }

  private TimelineEvent insertWithId(long id, TimelineEventAdminDto snapshot) {
    Timestamp now = Timestamp.from(clock.instant());
    jdbc.update(
        "insert into timeline_event (id, year, sort_order, created_at, updated_at)"
            + " values (?, ?, ?, ?, ?)",
        id,
        snapshot.year(),
        snapshot.sortOrder(),
        now,
        now);
    return events.findById(id).orElseThrow();
  }
}
