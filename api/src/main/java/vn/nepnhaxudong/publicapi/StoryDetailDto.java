package vn.nepnhaxudong.publicapi;

import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.story.Story;
import vn.nepnhaxudong.story.StoryTranslation;

/**
 * One story page. {@code bodyHtml} is the stored HTML, which was cleaned when it was saved.
 * {@code alternateSlug} is the slug of the other language when that language has its own slug,
 * otherwise null; the web page uses it for the hreflang link.
 */
public record StoryDetailDto(
    String slug,
    String title,
    String excerpt,
    String bodyHtml,
    String publishedAt,
    ImageRefDto cover,
    String alternateSlug) {

  static StoryDetailDto from(Story story, Lang lang, ImageRefs images) {
    var vi = story.translation(Lang.VI).orElseThrow();
    var en = story.translation(Lang.EN);
    String alternate =
        lang == Lang.EN ? vi.getSlug() : en.map(StoryTranslation::getSlug).orElse(null);
    return new StoryDetailDto(
        StorySummaryDto.slugOf(story, lang),
        PublicText.pick(lang, vi.getTitle(), en.map(StoryTranslation::getTitle).orElse(null)),
        PublicText.pick(lang, vi.getExcerpt(), en.map(StoryTranslation::getExcerpt).orElse(null)),
        PublicText.pick(lang, vi.getBodyHtml(), en.map(StoryTranslation::getBodyHtml).orElse(null)),
        StorySummaryDto.publishedAt(story),
        images.ref(story.getCoverMediaId()),
        alternate);
  }
}
