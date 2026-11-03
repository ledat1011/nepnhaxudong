package vn.nepnhaxudong.story;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StoryRepository extends JpaRepository<Story, Long> {

  /** The id to pass for a story that is not saved yet, so that no story is left out of the check. */
  long NEW_STORY_ID = -1L;

  List<Story> findAllByOrderByUpdatedAtDescIdDesc();

  /**
   * The stories of a status, newest publication first; the id breaks a tie. A story without a
   * publication date (it should not exist for a published one) goes last.
   */
  @Query(
      "select s from Story s where s.status = :status"
          + " order by s.publishedAt desc nulls last, s.id desc")
  List<Story> findNewestByStatus(@Param("status") StoryStatus status, Pageable pageable);

  /** The story of a status that has the slug in the language. */
  @Query(
      "select t.story from StoryTranslation t"
          + " where t.lang = :lang and t.slug = :slug and t.story.status = :status")
  Optional<Story> findBySlug(
      @Param("lang") String lang,
      @Param("slug") String slug,
      @Param("status") StoryStatus status);

  /** True when a story other than {@code storyId} already uses the slug in the language. */
  @Query(
      "select count(t) > 0 from StoryTranslation t"
          + " where t.lang = :lang and t.slug = :slug and t.story.id <> :storyId")
  boolean slugTakenByOther(
      @Param("lang") String lang, @Param("slug") String slug, @Param("storyId") long storyId);
}
