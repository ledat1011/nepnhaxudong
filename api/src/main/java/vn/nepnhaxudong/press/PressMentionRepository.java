package vn.nepnhaxudong.press;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PressMentionRepository extends JpaRepository<PressMention, Long> {

  List<PressMention> findAllByOrderBySortOrderAscIdAsc();

  /** The sort order that puts a new mention after all others. */
  @Query("select coalesce(max(p.sortOrder), -1) + 1 from PressMention p")
  int nextSortOrder();
}
