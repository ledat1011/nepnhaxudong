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
   * True when a product, a timeline event, a press mention or a story points to the image. The
   * database also refuses the delete ({@code on delete restrict}); this check gives the message.
   */
  @Query(
      value =
          """
          select exists (select 1 from product_media where media_id = :id)
              or exists (select 1 from timeline_event where media_id = :id)
              or exists (select 1 from press_mention where media_id = :id)
              or exists (select 1 from story where cover_media_id = :id)
          """,
      nativeQuery = true)
  boolean isUsed(@Param("id") long id);
}
