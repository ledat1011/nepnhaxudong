package vn.nepnhaxudong.product;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Long> {

  List<Product> findAllByOrderBySortOrderAscIdAsc();

  /** The products with "Hiện trên web" on, in display order: what the public website shows. */
  List<Product> findAllByVisibleTrueOrderBySortOrderAscIdAsc();

  /**
   * The product with its row locked until the transaction ends. Every write takes this lock first,
   * so a save, a show or hide and a restore of the same product run one after the other.
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select p from Product p where p.id = :id")
  Optional<Product> findByIdForUpdate(@Param("id") long id);

  /** The only write of "Hiện trên web": the entity never writes the column itself. */
  @Modifying(flushAutomatically = true)
  @Query("update Product p set p.visible = :visible where p.id = :id")
  int writeVisible(@Param("id") long id, @Param("visible") boolean visible);
}
