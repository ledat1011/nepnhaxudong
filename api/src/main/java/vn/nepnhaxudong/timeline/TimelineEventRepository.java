package vn.nepnhaxudong.timeline;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TimelineEventRepository extends JpaRepository<TimelineEvent, Long> {

  List<TimelineEvent> findAllByOrderBySortOrderAscIdAsc();

  /** The sort order that puts a new event after all others. */
  @Query("select coalesce(max(e.sortOrder), -1) + 1 from TimelineEvent e")
  int nextSortOrder();
}
