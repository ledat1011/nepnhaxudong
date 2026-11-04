package vn.nepnhaxudong.press;

import java.time.LocalDate;
import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.common.LocalizedText;

/**
 * A press mention as the admin sees it, with both languages. {@code missingEn} is true when the
 * title has no English text. It is also the snapshot kept in the audit log.
 */
public record PressMentionAdminDto(
    long id,
    String url,
    String sourceName,
    LocalDate publishedOn,
    LocalizedText title,
    Long mediaId,
    int sortOrder,
    boolean missingEn) {

  static PressMentionAdminDto from(PressMention mention) {
    var vi = mention.translation(Lang.VI).orElseThrow();
    var en = mention.translation(Lang.EN);
    var title =
        new LocalizedText(vi.getTitle(), en.map(PressMentionTranslation::getTitle).orElse(null));
    return new PressMentionAdminDto(
        mention.getId(),
        mention.getUrl(),
        mention.getSourceName(),
        mention.getPublishedOn(),
        title,
        mention.getMediaId(),
        mention.getSortOrder(),
        title.missingEn());
  }
}
