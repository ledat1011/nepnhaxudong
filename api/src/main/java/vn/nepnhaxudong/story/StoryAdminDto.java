package vn.nepnhaxudong.story;

import java.time.Instant;
import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.common.LocalizedText;

/**
 * A story as the admin sees it, with both languages. {@code missingEn} is true when the title, or
 * an excerpt or body that has Vietnamese text, has no English text. An empty Vietnamese body is
 * shown as null. It is also the snapshot kept in the audit log.
 */
public record StoryAdminDto(
    long id,
    StoryStatus status,
    Instant publishedAt,
    Long coverMediaId,
    LocalizedText slug,
    LocalizedText title,
    LocalizedText excerpt,
    LocalizedText bodyHtml,
    boolean missingEn) {

  static StoryAdminDto from(Story story) {
    var vi = story.translation(Lang.VI).orElseThrow();
    var en = story.translation(Lang.EN);
    var slug = new LocalizedText(vi.getSlug(), en.map(StoryTranslation::getSlug).orElse(null));
    var title = new LocalizedText(vi.getTitle(), en.map(StoryTranslation::getTitle).orElse(null));
    var excerpt =
        new LocalizedText(vi.getExcerpt(), en.map(StoryTranslation::getExcerpt).orElse(null));
    var bodyHtml =
        new LocalizedText(vi.getBodyHtml(), en.map(StoryTranslation::getBodyHtml).orElse(null));
    boolean missingEn =
        title.missingEn()
            || (excerpt.vi() != null && excerpt.missingEn())
            || (bodyHtml.vi() != null && bodyHtml.missingEn());
    return new StoryAdminDto(
        story.getId(),
        story.getStatus(),
        story.getPublishedAt(),
        story.getCoverMediaId(),
        slug,
        title,
        excerpt,
        bodyHtml,
        missingEn);
  }
}
