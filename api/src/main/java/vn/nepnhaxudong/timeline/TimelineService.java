package vn.nepnhaxudong.timeline;

import java.time.Clock;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nepnhaxudong.audit.AuditAction;
import vn.nepnhaxudong.audit.AuditService;
import vn.nepnhaxudong.common.ApiException;
import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.media.MediaRepository;

/** Reads and writes timeline events for the admin area. Every write is recorded in the audit log. */
@Service
public class TimelineService {

  static final String AUDIT_TYPE = "timeline_event";

  private final TimelineEventRepository events;
  private final MediaRepository media;
  private final AuditService audit;
  private final Clock clock;

  public TimelineService(
      TimelineEventRepository events, MediaRepository media, AuditService audit, Clock clock) {
    this.events = events;
    this.media = media;
    this.audit = audit;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<TimelineEventAdminDto> list() {
    return events.findAllByOrderBySortOrderAscIdAsc().stream()
        .map(TimelineEventAdminDto::from)
        .toList();
  }

  @Transactional(readOnly = true)
  public TimelineEventAdminDto get(long id) {
    return TimelineEventAdminDto.from(find(id));
  }

  @Transactional
  public TimelineEventAdminDto create(TimelineEventRequest request) {
    validate(request);
    int sortOrder =
        request.sortOrder() != null ? request.sortOrder() : events.nextSortOrder();
    var event = TimelineEvent.create();
    apply(event, request, sortOrder);
    events.save(event);
    var after = TimelineEventAdminDto.from(event);
    audit.record(AUDIT_TYPE, after.id(), AuditAction.CREATE, null, after);
    return after;
  }

  @Transactional
  public TimelineEventAdminDto update(long id, TimelineEventRequest request) {
    var event = find(id);
    validate(request);
    var before = TimelineEventAdminDto.from(event);
    apply(event, request, request.sortOrder() != null ? request.sortOrder() : event.getSortOrder());
    var after = TimelineEventAdminDto.from(event);
    audit.record(AUDIT_TYPE, id, AuditAction.UPDATE, before, after);
    return after;
  }

  @Transactional
  public void delete(long id) {
    var event = find(id);
    var before = TimelineEventAdminDto.from(event);
    events.delete(event);
    audit.record(AUDIT_TYPE, id, AuditAction.DELETE, before, null);
  }

  /**
   * Gives the events the order of the list (0, 1, 2, ...). The list must contain every existing id
   * exactly once. Each event that moves gets its own audit line, so it can be restored on its own.
   */
  @Transactional
  public void reorder(List<Long> ids) {
    if (ids == null) {
      throw invalid("Danh sách mã mốc không được để trống.");
    }
    Map<Long, TimelineEvent> existing = new HashMap<>();
    for (TimelineEvent event : events.findAllByOrderBySortOrderAscIdAsc()) {
      existing.put(event.getId(), event);
    }
    Set<Long> seen = new HashSet<>();
    for (Long id : ids) {
      if (id == null) {
        throw invalid("Mã mốc không được để trống.");
      }
      if (!seen.add(id)) {
        throw invalid("Mã mốc bị lặp: " + id + ".");
      }
      if (!existing.containsKey(id)) {
        throw invalid("Mã mốc không tồn tại: " + id + ".");
      }
    }
    for (Long id : existing.keySet().stream().sorted().toList()) {
      if (!seen.contains(id)) {
        throw invalid("Thiếu mã mốc: " + id + ".");
      }
    }
    for (int position = 0; position < ids.size(); position++) {
      TimelineEvent event = existing.get(ids.get(position));
      if (event.getSortOrder() != position) {
        var before = TimelineEventAdminDto.from(event);
        event.setSortOrder(position);
        audit.record(
            AUDIT_TYPE, event.getId(), AuditAction.UPDATE, before, TimelineEventAdminDto.from(event));
      }
    }
  }

  private TimelineEvent find(long id) {
    return events
        .findById(id)
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy mốc hành trình."));
  }

  /** Writes the request into the event and its translations; the caller has validated it. */
  void apply(TimelineEvent event, TimelineEventRequest request, int sortOrder) {
    event.setEventYear(request.year());
    event.setSortOrder(sortOrder);
    event.setMediaId(request.mediaId());
    event.putTranslation(Lang.VI, request.title().vi(), request.description().vi());
    if (request.title().en() == null) {
      event.removeTranslation(Lang.EN);
    } else {
      event.putTranslation(Lang.EN, request.title().en(), request.description().en());
    }
    // The event row may be unchanged while its texts changed; the change time still moves.
    event.touch(clock.instant());
  }

  private void validate(TimelineEventRequest request) {
    validateContent(request);
    if (request.mediaId() != null && !media.existsById(request.mediaId())) {
      throw invalid("Ảnh không tồn tại: " + request.mediaId() + ".");
    }
  }

  /** The rules that do not need the database. The image is checked separately. */
  void validateContent(TimelineEventRequest request) {
    if (request.year() == null
        || request.year() < TimelineEventRequest.MIN_YEAR
        || request.year() > TimelineEventRequest.MAX_YEAR) {
      throw invalid(TimelineEventRequest.YEAR_RANGE);
    }
    if (request.title() == null || request.title().vi() == null) {
      throw invalid("Tiêu đề mốc (tiếng Việt) không được để trống.");
    }
    if (request.title().en() == null && request.description().en() != null) {
      throw invalid("Tiêu đề mốc (tiếng Anh) không được để trống khi đã có nội dung tiếng Anh.");
    }
  }

  private static ApiException invalid(String detail) {
    return new ApiException(HttpStatus.BAD_REQUEST, detail);
  }
}
