package vn.nepnhaxudong.timeline;

import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.common.LocalizedText;

/**
 * A timeline event as the admin sees it, with both languages. {@code missingEn} is true when the
 * title, or a description that has Vietnamese text, has no English text. It is also the snapshot
 * kept in the audit log.
 */
public record TimelineEventAdminDto(
    long id,
    int year,
    int sortOrder,
    LocalizedText title,
    LocalizedText description,
    Long mediaId,
    boolean missingEn) {

  static TimelineEventAdminDto from(TimelineEvent event) {
    var vi = event.translation(Lang.VI).orElseThrow();
    var en = event.translation(Lang.EN);
    var title =
        new LocalizedText(vi.getTitle(), en.map(TimelineEventTranslation::getTitle).orElse(null));
    var description =
        new LocalizedText(
            vi.getDescription(), en.map(TimelineEventTranslation::getDescription).orElse(null));
    boolean missingEn = title.missingEn() || (description.vi() != null && description.missingEn());
    return new TimelineEventAdminDto(
        event.getId(),
        event.getEventYear(),
        event.getSortOrder(),
        title,
        description,
        event.getMediaId(),
        missingEn);
  }
}
