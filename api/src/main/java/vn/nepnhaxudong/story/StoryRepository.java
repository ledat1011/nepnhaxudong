package vn.nepnhaxudong.story;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StoryRepository extends JpaRepository<Story, Long> {

  /** The id to pass for a story that is not saved yet, so that no story is left out of the check. */
  long NEW_STORY_ID = -1L;

  List<Story> findAllByOrderByUpdatedAtDescIdDesc();

  /** True when a story other than {@code storyId} already uses the slug in the language. */
  @Query(
      "select count(t) > 0 from StoryTranslation t"
          + " where t.lang = :lang and t.slug = :slug and t.story.id <> :storyId")
  boolean slugTakenByOther(
      @Param("lang") String lang, @Param("slug") String slug, @Param("storyId") long storyId);
}
