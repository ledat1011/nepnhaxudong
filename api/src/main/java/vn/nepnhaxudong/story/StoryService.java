package vn.nepnhaxudong.story;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nepnhaxudong.audit.AuditAction;
import vn.nepnhaxudong.audit.AuditService;
import vn.nepnhaxudong.common.ApiException;
import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.common.LocalizedText;
import vn.nepnhaxudong.common.SlugGenerator;
import vn.nepnhaxudong.media.MediaRepository;

/**
 * Reads and writes stories for the admin area. Every write, including publish and unpublish, is
 * recorded in the audit log in the same transaction.
 */
@Service
public class StoryService {

  static final String AUDIT_TYPE = "story";
  static final String SLUG_TAKEN = "Đường dẫn bài viết đã tồn tại.";
  static final String SLUG_REQUIRED = "Hãy nhập đường dẫn bài viết.";

  private static final String SLUG_CONSTRAINT = "story_translation_lang_slug_unique";

  private final StoryRepository stories;
  private final MediaRepository media;
  private final AuditService audit;
  private final ApplicationEventPublisher events;
  private final Clock clock;

  public StoryService(
      StoryRepository stories,
      MediaRepository media,
      AuditService audit,
      ApplicationEventPublisher events,
      Clock clock) {
    this.stories = stories;
    this.media = media;
    this.audit = audit;
    this.events = events;
    this.clock = clock;
  }

  /** All stories of every status, the most recently changed first. */
  @Transactional(readOnly = true)
  public List<StoryAdminDto> list() {
    return stories.findAllByOrderByUpdatedAtDescIdDesc().stream()
        .map(StoryAdminDto::from)
        .toList();
  }

  @Transactional(readOnly = true)
  public StoryAdminDto get(long id) {
    return StoryAdminDto.from(find(id));
  }

  @Transactional
  public StoryAdminDto create(StoryRequest request) {
    validateContent(request);
    LocalizedText slugs = resolveSlugs(request, null);
    requireCoverExists(request.coverMediaId());
    requireSlugsFree(slugs, StoryRepository.NEW_STORY_ID);
    var story = Story.create();
    apply(story, request, slugs);
    try {
      stories.saveAndFlush(story);
    } catch (DataIntegrityViolationException e) {
      throw translate(e);
    }
    var after = StoryAdminDto.from(story);
    audit.record(AUDIT_TYPE, after.id(), AuditAction.CREATE, null, after);
    events.publishEvent(StoryChanges.event(null, after));
    return after;
  }

  @Transactional
  public StoryAdminDto update(long id, StoryRequest request) {
    var story = find(id);
    validateContent(request);
    LocalizedText slugs = resolveSlugs(request, story);
    requireCoverExists(request.coverMediaId());
    requireSlugsFree(slugs, id);
    var before = StoryAdminDto.from(story);
    apply(story, request, slugs);
    try {
      stories.flush();
    } catch (DataIntegrityViolationException e) {
      throw translate(e);
    }
    var after = StoryAdminDto.from(story);
    audit.record(AUDIT_TYPE, id, AuditAction.UPDATE, before, after);
    events.publishEvent(StoryChanges.event(before, after));
    return after;
  }

  @Transactional
  public void delete(long id) {
    var story = find(id);
    var before = StoryAdminDto.from(story);
    stories.delete(story);
    audit.record(AUDIT_TYPE, id, AuditAction.DELETE, before, null);
    events.publishEvent(StoryChanges.event(before, null));
  }

  /**
   * Makes the story public. The first publication sets {@code publishedAt}; a story that was
   * unpublished and is published again keeps its first date. Publishing a published story changes
   * nothing and writes no audit line.
   */
  @Transactional
  public StoryAdminDto publish(long id) {
    var story = find(id);
    var before = StoryAdminDto.from(story);
    if (story.getStatus() == StoryStatus.PUBLISHED) {
      return before;
    }
    Instant publishedAt = story.getPublishedAt() != null ? story.getPublishedAt() : clock.instant();
    story.setPublication(StoryStatus.PUBLISHED, publishedAt);
    return recordStatusChange(story, before);
  }

  /** Hides the story again and keeps {@code publishedAt}. A draft stays as it is, with no audit line. */
  @Transactional
  public StoryAdminDto unpublish(long id) {
    var story = find(id);
    var before = StoryAdminDto.from(story);
    if (story.getStatus() == StoryStatus.DRAFT) {
      return before;
    }
    story.setPublication(StoryStatus.DRAFT, story.getPublishedAt());
    return recordStatusChange(story, before);
  }

  private StoryAdminDto recordStatusChange(Story story, StoryAdminDto before) {
    var after = StoryAdminDto.from(story);
    audit.record(AUDIT_TYPE, after.id(), AuditAction.UPDATE, before, after);
    events.publishEvent(StoryChanges.event(before, after));
    return after;
  }

  private Story find(long id) {
    return stories
        .findById(id)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết."));
  }

  /** Writes the request into the story and its texts; the caller has validated it. */
  void apply(Story story, StoryRequest request, LocalizedText slugs) {
    story.setCoverMediaId(request.coverMediaId());
    story.putTranslation(
        Lang.VI,
        slugs.vi(),
        request.title().vi(),
        request.excerpt().vi(),
        sanitized(request.bodyHtml().vi()));
    if (request.title().en() == null) {
      story.removeTranslation(Lang.EN);
    } else {
      story.putTranslation(
          Lang.EN,
          slugs.en(),
          request.title().en(),
          request.excerpt().en(),
          sanitized(request.bodyHtml().en()));
    }
    // The story row may be unchanged while its texts changed; the change time still moves.
    story.touch(clock.instant());
  }

  /** A missing body is saved as an empty string, which is the default of the column. */
  private static String sanitized(String html) {
    return html == null ? "" : StoryHtmlSanitizer.clean(html);
  }

  /** The rules that do not need the database. The cover image and the slugs are checked apart. */
  void validateContent(StoryRequest request) {
    if (request.title() == null || request.title().vi() == null) {
      throw invalid("Tiêu đề bài viết (tiếng Việt) không được để trống.");
    }
    boolean hasEnglishText =
        request.excerpt().en() != null
            || request.bodyHtml().en() != null
            || request.slug().en() != null;
    if (request.title().en() == null && hasEnglishText) {
      throw invalid("Tiêu đề bài viết (tiếng Anh) không được để trống khi đã có nội dung tiếng Anh.");
    }
  }

  /**
   * The slug of each language: the typed slug when there is one (normalized), otherwise the slug
   * the story already has in that language, otherwise one made from the title. A story that is
   * edited keeps its address when the admin leaves the slug blank, so a public link does not break
   * when a title changes. {@code existing} is null when the story is new. There is an English slug
   * only when there is an English title.
   */
  LocalizedText resolveSlugs(StoryRequest request, Story existing) {
    String vi =
        slugOf(request.slug().vi(), storedSlug(existing, Lang.VI), request.title().vi());
    String en =
        request.title().en() == null
            ? null
            : slugOf(request.slug().en(), storedSlug(existing, Lang.EN), request.title().en());
    return new LocalizedText(vi, en);
  }

  private static String storedSlug(Story existing, Lang lang) {
    if (existing == null) {
      return null;
    }
    return existing.translation(lang).map(StoryTranslation::getSlug).orElse(null);
  }

  private static String slugOf(String typed, String stored, String title) {
    if (typed == null && stored != null) {
      return stored;
    }
    String slug = SlugGenerator.slugify(typed != null ? typed : title);
    if (slug.isEmpty()) {
      throw invalid(SLUG_REQUIRED);
    }
    return slug;
  }

  /** Answers 409 when another story already uses one of the slugs in the same language. */
  void requireSlugsFree(LocalizedText slugs, long storyId) {
    if (stories.slugTakenByOther(Lang.VI.code(), slugs.vi(), storyId)
        || (slugs.en() != null && stories.slugTakenByOther(Lang.EN.code(), slugs.en(), storyId))) {
      throw new ApiException(HttpStatus.CONFLICT, SLUG_TAKEN);
    }
  }

  private void requireCoverExists(Long coverMediaId) {
    if (coverMediaId != null && !media.existsById(coverMediaId)) {
      throw invalid("Ảnh không tồn tại: " + coverMediaId + ".");
    }
  }

  /**
   * Two admins can save the same slug at the same moment; the unique index then refuses the second
   * write. That is the same 409 as the check before the write. Any other violation is not ours.
   */
  private static RuntimeException translate(DataIntegrityViolationException e) {
    String cause = NestedExceptionUtils.getMostSpecificCause(e).getMessage();
    if (cause != null && cause.contains(SLUG_CONSTRAINT)) {
      return new ApiException(HttpStatus.CONFLICT, SLUG_TAKEN);
    }
    return e;
  }

  private static ApiException invalid(String detail) {
    return new ApiException(HttpStatus.BAD_REQUEST, detail);
  }
}
