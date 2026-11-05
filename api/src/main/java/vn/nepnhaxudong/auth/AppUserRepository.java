package vn.nepnhaxudong.auth;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

  Optional<AppUser> findByEmail(String email);

  /** Locks the row until the end of the transaction. */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select u from AppUser u where u.id = :id")
  Optional<AppUser> findByIdForUpdate(long id);

  /**
   * Locks every account row, in id order, until the end of the transaction. Account management uses
   * it so that two owners who act at the same time run one after the other and each sees the roles
   * and states the other one committed (the rule "at least one active owner" depends on all rows).
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select u from AppUser u order by u.id")
  List<AppUser> findAllForUpdate();

  /** Locks the row, so two parallel wrong passwords cannot both read the same failed-attempt count. */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select u from AppUser u where u.email = :email")
  Optional<AppUser> findByEmailForUpdate(String email);
}
