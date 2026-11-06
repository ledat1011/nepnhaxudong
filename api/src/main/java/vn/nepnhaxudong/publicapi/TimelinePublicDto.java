package vn.nepnhaxudong.publicapi;

import java.util.List;
import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.timeline.TimelineEvent;
import vn.nepnhaxudong.timeline.TimelineEventTranslation;

/**
 * A milestone of the family story with its texts chosen by language. {@code images} are in display
 * order; an image that cannot be found is left out.
 */
public record TimelinePublicDto(
    int year, String title, String description, List<ImageRefDto> images) {

  static TimelinePublicDto from(TimelineEvent event, Lang lang, ImageRefs images) {
    var vi = event.translation(Lang.VI).orElseThrow();
    var en = event.translation(Lang.EN);
    return new TimelinePublicDto(
        event.getEventYear(),
        PublicText.pick(
            lang, vi.getTitle(), en.map(TimelineEventTranslation::getTitle).orElse(null)),
        PublicText.pick(
            lang,
            vi.getDescription(),
            en.map(TimelineEventTranslation::getDescription).orElse(null)),
        images.refs(event.mediaIds()));
  }
}
