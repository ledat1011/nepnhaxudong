package vn.nepnhaxudong.timeline;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.common.LocalizedText;

/**
 * A timeline event as the admin sees it, with both languages. {@code mediaIds} are the images in
 * display order. {@code missingEn} is true when the title, or a description that has Vietnamese
 * text, has no English text. It is also the snapshot kept in the audit log.
 */
public record TimelineEventAdminDto(
    long id,
    int year,
    int sortOrder,
    LocalizedText title,
    LocalizedText description,
    List<Long> mediaIds,
    boolean missingEn) {

  /**
   * A missing list is an empty list. The elements are kept as they are, so that a restore can
   * refuse a damaged snapshot (a null id, the same id twice).
   */
  public TimelineEventAdminDto {
    mediaIds = mediaIds == null ? List.of() : mediaIds;
  }

  /**
   * Reads a snapshot. Snapshots written before an event had several images have one field {@code
   * mediaId} (a number or null) instead of the list; they are read as a list of that one image, or
   * as no images.
   */
  @JsonCreator
  static TimelineEventAdminDto fromJson(
      @JsonProperty("id") long id,
      @JsonProperty("year") int year,
      @JsonProperty("sortOrder") int sortOrder,
      @JsonProperty("title") LocalizedText title,
      @JsonProperty("description") LocalizedText description,
      @JsonProperty("mediaIds") List<Long> mediaIds,
      @JsonProperty("mediaId") Long oldMediaId,
      @JsonProperty("missingEn") boolean missingEn) {
    List<Long> images =
        mediaIds != null ? mediaIds : oldMediaId != null ? List.of(oldMediaId) : List.of();
    return new TimelineEventAdminDto(
        id, year, sortOrder, title, description, images, missingEn);
  }

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
        event.mediaIds(),
        missingEn);
  }
}
