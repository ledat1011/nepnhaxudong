package vn.nepnhaxudong.publish;

import java.util.Collection;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

/**
 * Published inside the transaction that changes public content. After the commit the website is
 * told to drop its cached pages for these tags. The tags are the ones the website understands:
 * {@code home}, {@code stories} and {@code story:<slug>}.
 *
 * <p>The tags are a set, so a tag that is named twice is sent once.
 */
public record ContentChangedEvent(Set<String> tags) {

  private static final String HOME = "home";
  private static final String STORIES = "stories";
  private static final String STORY_PREFIX = "story:";

  public ContentChangedEvent {
    tags = Set.copyOf(tags);
  }

  /** A change of products, the timeline, press mentions, site settings or images. */
  public static ContentChangedEvent home() {
    return new ContentChangedEvent(Set.of(HOME));
  }

  /**
   * A change of a story. {@code slugs} are all the slugs the story had before and has after the
   * change, in every language; a missing slug (null) is ignored. A story can also appear on the
   * home page, so {@code home} is always part of it.
   */
  public static ContentChangedEvent stories(Collection<String> slugs) {
    Set<String> tags = new HashSet<>();
    tags.add(HOME);
    tags.add(STORIES);
    slugs.stream().filter(Objects::nonNull).forEach(slug -> tags.add(STORY_PREFIX + slug));
    return new ContentChangedEvent(tags);
  }
}
