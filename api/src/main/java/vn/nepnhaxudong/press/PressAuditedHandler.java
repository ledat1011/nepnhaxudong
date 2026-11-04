package vn.nepnhaxudong.press;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.Clock;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;
import vn.nepnhaxudong.audit.JsonAuditedHandler;
import vn.nepnhaxudong.common.ApiException;
import vn.nepnhaxudong.media.MediaReferences;

/**
 * Reads and restores press mentions for the audit log. A deleted mention is inserted again with
 * its old id; its titles are then created through the normal entity code.
 */
@Component
class PressAuditedHandler extends JsonAuditedHandler<PressMentionAdminDto> {

  private final PressMentionRepository mentions;
  private final PressService service;
  private final MediaReferences mediaReferences;
  private final JdbcTemplate jdbc;
  private final Clock clock;

  PressAuditedHandler(
      PressMentionRepository mentions,
      PressService service,
      MediaReferences mediaReferences,
      JdbcTemplate jdbc,
      Clock clock,
      JsonMapper json) {
    super(PressService.AUDIT_TYPE, PressMentionAdminDto.class, json);
    this.mentions = mentions;
    this.service = service;
    this.mediaReferences = mediaReferences;
    this.jdbc = jdbc;
    this.clock = clock;
  }

  @Override
  protected Optional<PressMentionAdminDto> find(long entityId) {
    return mentions.findById(entityId).map(PressMentionAdminDto::from);
  }

  @Override
  protected void restore(long entityId, PressMentionAdminDto snapshot) {
    if (snapshot.id() != entityId) {
      throw badSnapshot();
    }
    var request =
        new PressMentionRequest(
            snapshot.url(),
            snapshot.sourceName(),
            snapshot.publishedOn(),
            snapshot.title(),
            snapshot.mediaId(),
            snapshot.sortOrder());
    try {
      service.validateContent(request);
    } catch (ApiException e) {
      throw badSnapshot();
    }
    if (snapshot.mediaId() != null) {
      mediaReferences.requireAllExist(List.of(snapshot.mediaId()));
    }
    PressMention mention =
        mentions.findById(entityId).orElseGet(() -> insertWithId(entityId, snapshot));
    service.apply(mention, request, snapshot.sortOrder());
  }

  private PressMention insertWithId(long id, PressMentionAdminDto snapshot) {
    Timestamp now = Timestamp.from(clock.instant());
    jdbc.update(
        "insert into press_mention"
            + " (id, url, source_name, published_on, media_id, sort_order, created_at, updated_at)"
            + " values (?, ?, ?, ?, ?, ?, ?, ?)",
        id,
        snapshot.url(),
        snapshot.sourceName(),
        snapshot.publishedOn() == null ? null : Date.valueOf(snapshot.publishedOn()),
        snapshot.mediaId(),
        snapshot.sortOrder(),
        now,
        now);
    return mentions.findById(id).orElseThrow();
  }
}
