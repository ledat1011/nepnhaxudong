package vn.nepnhaxudong.product;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Product management in the admin area. Paths are relative to the context path {@code /api}. */
@RestController
@RequestMapping("/admin/products")
public class ProductAdminController {

  private final ProductService service;

  public ProductAdminController(ProductService service) {
    this.service = service;
  }

  @GetMapping
  public List<ProductAdminDto> list() {
    return service.list();
  }

  @GetMapping("/{id}")
  public ProductAdminDto get(@PathVariable long id) {
    return service.get(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ProductAdminDto create(@Valid @RequestBody ProductRequest body) {
    return service.create(body);
  }

  /**
   * Replaces the whole product, including its pack sizes and images. "Hiện trên web" is not part
   * of the body: it changes only through show and hide.
   */
  @PutMapping("/{id}")
  public ProductAdminDto update(@PathVariable long id, @Valid @RequestBody ProductRequest body) {
    return service.update(id, body);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable long id) {
    service.delete(id);
  }

  /** Turns "Hiện trên web" on. Answers 200 with the product, also when it was already shown. */
  @PostMapping("/{id}/show")
  public ProductAdminDto show(@PathVariable long id) {
    return service.show(id);
  }

  /** Turns "Hiện trên web" off. Answers 200 with the product, also when it was already hidden. */
  @PostMapping("/{id}/hide")
  public ProductAdminDto hide(@PathVariable long id) {
    return service.hide(id);
  }
}
