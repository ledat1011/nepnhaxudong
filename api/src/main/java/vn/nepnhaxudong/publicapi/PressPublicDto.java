package vn.nepnhaxudong.publicapi;

import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.press.PressMention;
import vn.nepnhaxudong.press.PressMentionTranslation;

/** A newspaper article. {@code publishedOn} is an ISO date (yyyy-MM-dd) or null. */
public record PressPublicDto(
    String title, String sourceName, String url, String publishedOn, ImageRefDto image) {

  static PressPublicDto from(PressMention mention, Lang lang, ImageRefs images) {
    var vi = mention.translation(Lang.VI).orElseThrow();
    var en = mention.translation(Lang.EN);
    return new PressPublicDto(
        PublicText.pick(
            lang, vi.getTitle(), en.map(PressMentionTranslation::getTitle).orElse(null)),
        mention.getSourceName(),
        mention.getUrl(),
        mention.getPublishedOn() == null ? null : mention.getPublishedOn().toString(),
        images.ref(mention.getMediaId()));
  }
}
