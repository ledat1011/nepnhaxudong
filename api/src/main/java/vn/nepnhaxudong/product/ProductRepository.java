package vn.nepnhaxudong.product;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {

  List<Product> findAllByOrderBySortOrderAscIdAsc();

  /** The products with "Hiện trên web" on, in display order: what the public website shows. */
  List<Product> findAllByVisibleTrueOrderBySortOrderAscIdAsc();
}
