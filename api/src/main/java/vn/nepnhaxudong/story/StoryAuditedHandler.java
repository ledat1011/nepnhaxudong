package vn.nepnhaxudong.story;

import java.sql.Timestamp;
import java.time.Clock;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;
import vn.nepnhaxudong.audit.JsonAuditedHandler;
import vn.nepnhaxudong.common.ApiException;
import vn.nepnhaxudong.common.LocalizedText;
import vn.nepnhaxudong.media.MediaReferences;

/**
 * Reads and restores stories for the audit log. A deleted story is inserted again with its old id,
 * status and publication date; its texts are then created through the normal entity code. A slug
 * that another story uses by now is refused with 409.
 */
@Component
class StoryAuditedHandler extends JsonAuditedHandler<StoryAdminDto> {

  private final StoryRepository stories;
  private final StoryService service;
  private final MediaReferences mediaReferences;
  private final JdbcTemplate jdbc;
  private final Clock clock;

  StoryAuditedHandler(
      StoryRepository stories,
      StoryService service,
      MediaReferences mediaReferences,
      JdbcTemplate jdbc,
      Clock clock,
      JsonMapper json) {
    super(StoryService.AUDIT_TYPE, StoryAdminDto.class, json);
    this.stories = stories;
    this.service = service;
    this.mediaReferences = mediaReferences;
    this.jdbc = jdbc;
    this.clock = clock;
  }

  @Override
  protected Optional<StoryAdminDto> find(long entityId) {
    return stories.findById(entityId).map(StoryAdminDto::from);
  }

  @Override
  protected void restore(long entityId, StoryAdminDto snapshot) {
    if (snapshot.id() != entityId || !hasValidPublication(snapshot)) {
      throw badSnapshot();
    }
    var request =
        new StoryRequest(
            snapshot.coverMediaId(),
            snapshot.slug(),
            snapshot.title(),
            snapshot.excerpt(),
            snapshot.bodyHtml());
    LocalizedText slugs;
    try {
      service.validateContent(request);
      slugs = service.resolveSlugs(request, null);
    } catch (ApiException e) {
      throw badSnapshot();
    }
    if (snapshot.coverMediaId() != null) {
      mediaReferences.requireAllExist(List.of(snapshot.coverMediaId()));
    }
    service.requireSlugsFree(slugs, entityId);
    Story story = stories.findById(entityId).orElseGet(() -> insertWithId(entityId, snapshot));
    service.apply(story, request, slugs);
    story.setPublication(snapshot.status(), snapshot.publishedAt());
  }

  private static boolean hasValidPublication(StoryAdminDto snapshot) {
    return snapshot.status() != null
        && (snapshot.status() != StoryStatus.PUBLISHED || snapshot.publishedAt() != null);
  }

  private Story insertWithId(long id, StoryAdminDto snapshot) {
    Timestamp now = Timestamp.from(clock.instant());
    jdbc.update(
        "insert into story (id, status, published_at, cover_media_id, created_at, updated_at)"
            + " values (?, ?, ?, ?, ?, ?)",
        id,
        snapshot.status().name(),
        snapshot.publishedAt() == null ? null : Timestamp.from(snapshot.publishedAt()),
        snapshot.coverMediaId(),
        now,
        now);
    return stories.findById(id).orElseThrow();
  }
}
