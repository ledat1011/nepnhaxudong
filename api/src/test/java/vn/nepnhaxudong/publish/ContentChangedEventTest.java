package vn.nepnhaxudong.publish;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

class ContentChangedEventTest {

  @Test
  void homeIsTheOnlyTagOfAContentChange() {
    assertThat(ContentChangedEvent.home().tags()).containsExactly("home");
  }

  @Test
  void aStoryChangeHasHomeStoriesAndOneTagPerSlug() {
    var event = ContentChangedEvent.stories(List.of("mua-gat", "harvest"));

    assertThat(event.tags()).containsExactlyInAnyOrder("home", "stories", "story:mua-gat", "story:harvest");
  }

  @Test
  void theSameSlugTwiceAndMissingSlugsGiveOneTagOrNone() {
    var event = ContentChangedEvent.stories(Arrays.asList("rice", "rice", null));

    assertThat(event.tags()).containsExactlyInAnyOrder("home", "stories", "story:rice");
  }

  @Test
  void theTagsCannotBeChangedAfterwards() {
    var event = ContentChangedEvent.home();

    assertThatThrownBy(() -> event.tags().add("stories"))
        .isInstanceOf(UnsupportedOperationException.class);
  }
}
