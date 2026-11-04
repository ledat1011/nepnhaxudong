package vn.nepnhaxudong.story;

import java.util.ArrayList;
import java.util.List;
import vn.nepnhaxudong.publish.ContentChangedEvent;

/** Builds the event that tells the website about a change of a story. */
final class StoryChanges {

  private StoryChanges() {}

  /**
   * The event for a change from {@code before} to {@code after} (null when the story did not exist
   * before or does not exist after). It names the slugs of both states, in both languages: when a
   * slug changed, the page at the old address must stop being served from the cache too.
   */
  static ContentChangedEvent event(StoryAdminDto before, StoryAdminDto after) {
    List<String> slugs = new ArrayList<>();
    for (StoryAdminDto state : new StoryAdminDto[] {before, after}) {
      if (state != null) {
        slugs.add(state.slug().vi());
        slugs.add(state.slug().en());
      }
    }
    return ContentChangedEvent.stories(slugs);
  }
}
