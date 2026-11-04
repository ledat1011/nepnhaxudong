package vn.nepnhaxudong.audit;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

  /**
   * The audit list, newest first. A null filter means "any". The user name is null when the user
   * does not exist any more (the left join finds nothing).
   */
  @Query(
      """
      select new vn.nepnhaxudong.audit.AuditRow(
          a.id, u.displayName, a.entityType, a.entityId, a.action, a.createdAt,
          a.beforeJson, a.afterJson)
      from AuditLog a left join vn.nepnhaxudong.auth.AppUser u on u.id = a.userId
      where (:entityType is null or a.entityType = :entityType)
        and (:entityId is null or a.entityId = :entityId)
      order by a.createdAt desc, a.id desc
      """)
  List<AuditRow> search(
      @Param("entityType") String entityType,
      @Param("entityId") Long entityId,
      Pageable pageable);

  /** One line with the user name, or empty when the id does not exist. */
  @Query(
      """
      select new vn.nepnhaxudong.audit.AuditRow(
          a.id, u.displayName, a.entityType, a.entityId, a.action, a.createdAt,
          a.beforeJson, a.afterJson)
      from AuditLog a left join vn.nepnhaxudong.auth.AppUser u on u.id = a.userId
      where a.id = :id
      """)
  Optional<AuditRow> findRow(@Param("id") long id);
}
