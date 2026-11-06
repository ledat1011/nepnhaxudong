package vn.nepnhaxudong.media;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MediaRepository extends JpaRepository<Media, Long> {

  /** Newest first; the id breaks a tie between images saved at the same time. */
  List<Media> findAllByOrderByCreatedAtDescIdDesc(Pageable pageable);

  /**
   * True when a product, a timeline event, a press mention or a story points to the image, or a story
   * body contains it as {@code <img src="/media/path">}. The database also refuses the delete of a linked
   * row ({@code on delete restrict}); this check gives the message and also covers the story bodies,
   * which have no foreign key.
   */
  @Query(
      value =
          """
          select exists (select 1 from product_media where media_id = :id)
              or exists (select 1 from timeline_event_media where media_id = :id)
              or exists (select 1 from press_mention where media_id = :id)
              or exists (select 1 from story where cover_media_id = :id)
              or exists (
                  select 1
                  from media m
                      join story_translation t on position('/media/' || m.path in t.body_html) > 0
                  where m.id = :id)
          """,
      nativeQuery = true)
  boolean isUsed(@Param("id") long id);
}
