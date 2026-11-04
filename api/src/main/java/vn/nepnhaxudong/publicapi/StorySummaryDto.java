package vn.nepnhaxudong.publicapi;

import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.story.Story;
import vn.nepnhaxudong.story.StoryTranslation;

/**
 * A story in a list. {@code slug} is the slug of the page language, or the Vietnamese slug when
 * the story has no English text. {@code publishedAt} is an ISO-8601 instant.
 */
public record StorySummaryDto(
    String slug, String title, String excerpt, String publishedAt, ImageRefDto cover) {

  static StorySummaryDto from(Story story, Lang lang, ImageRefs images) {
    var vi = story.translation(Lang.VI).orElseThrow();
    var en = story.translation(Lang.EN);
    return new StorySummaryDto(
        slugOf(story, lang),
        PublicText.pick(lang, vi.getTitle(), en.map(StoryTranslation::getTitle).orElse(null)),
        PublicText.pick(lang, vi.getExcerpt(), en.map(StoryTranslation::getExcerpt).orElse(null)),
        publishedAt(story),
        images.ref(story.getCoverMediaId()));
  }

  /** The slug in the language of the page; English falls back to the Vietnamese slug. */
  static String slugOf(Story story, Lang lang) {
    if (lang == Lang.EN) {
      var en = story.translation(Lang.EN);
      if (en.isPresent()) {
        return en.get().getSlug();
      }
    }
    return story.translation(Lang.VI).orElseThrow().getSlug();
  }

  /** The first publication time; the creation time for a published story that has none. */
  static String publishedAt(Story story) {
    var instant = story.getPublishedAt() != null ? story.getPublishedAt() : story.getCreatedAt();
    return instant.toString();
  }
}
