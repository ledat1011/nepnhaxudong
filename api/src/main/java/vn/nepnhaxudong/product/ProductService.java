package vn.nepnhaxudong.product;

import java.time.Clock;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nepnhaxudong.audit.AuditAction;
import vn.nepnhaxudong.audit.AuditService;
import vn.nepnhaxudong.common.ApiException;
import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.media.Media;
import vn.nepnhaxudong.media.MediaRepository;

/** Reads and writes products for the admin area. Every write is recorded in the audit log. */
@Service
public class ProductService {

  static final String AUDIT_TYPE = "product";

  private final ProductRepository products;
  private final MediaRepository media;
  private final AuditService audit;
  private final Clock clock;

  public ProductService(
      ProductRepository products, MediaRepository media, AuditService audit, Clock clock) {
    this.products = products;
    this.media = media;
    this.audit = audit;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<ProductAdminDto> list() {
    return products.findAllByOrderBySortOrderAscIdAsc().stream()
        .map(ProductAdminDto::from)
        .toList();
  }

  @Transactional(readOnly = true)
  public ProductAdminDto get(long id) {
    return ProductAdminDto.from(find(id));
  }

  @Transactional
  public ProductAdminDto create(ProductRequest request) {
    validate(request);
    var product = Product.create();
    apply(product, request);
    products.save(product);
    var after = ProductAdminDto.from(product);
    audit.record(AUDIT_TYPE, after.id(), AuditAction.CREATE, null, after);
    return after;
  }

  @Transactional
  public ProductAdminDto update(long id, ProductRequest request) {
    var product = find(id);
    validate(request);
    var before = ProductAdminDto.from(product);
    apply(product, request);
    var after = ProductAdminDto.from(product);
    audit.record(AUDIT_TYPE, id, AuditAction.UPDATE, before, after);
    return after;
  }

  @Transactional
  public void delete(long id) {
    var product = find(id);
    var before = ProductAdminDto.from(product);
    products.delete(product);
    audit.record(AUDIT_TYPE, id, AuditAction.DELETE, before, null);
  }

  private Product find(long id) {
    return products
        .findById(id)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm."));
  }

  private void apply(Product product, ProductRequest request) {
    product.setSortOrder(request.sortOrder());
    product.setShowPrice(request.showPrice());
    product.putTranslation(
        Lang.VI,
        request.name().vi(),
        request.description().vi(),
        request.features().vi(),
        request.cookingTips().vi());
    if (request.name().en() == null) {
      product.removeTranslation(Lang.EN);
    } else {
      product.putTranslation(
          Lang.EN,
          request.name().en(),
          request.description().en(),
          request.features().en(),
          request.cookingTips().en());
    }
    product.replacePackagings(request.packagings());
    product.replaceMedia(request.mediaIds());
    // The product row may be unchanged while its children changed; the change time still moves.
    product.touch(clock.instant());
  }

  private void validate(ProductRequest request) {
    if (request.name() == null || request.name().vi() == null) {
      throw invalid("Tên sản phẩm (tiếng Việt) không được để trống.");
    }
    if (request.features().vi().isEmpty()) {
      throw invalid("Đặc điểm (tiếng Việt) cần có ít nhất một mục.");
    }
    boolean hasEnglishContent =
        request.description().en() != null
            || !request.features().en().isEmpty()
            || request.cookingTips().en() != null;
    if (request.name().en() == null && hasEnglishContent) {
      throw invalid("Tên sản phẩm (tiếng Anh) không được để trống khi đã có nội dung tiếng Anh.");
    }
    validateMedia(request.mediaIds());
  }

  private void validateMedia(List<Long> ids) {
    if (ids.stream().anyMatch(Objects::isNull)) {
      throw invalid("Mã ảnh không hợp lệ.");
    }
    Set<Long> seen = new HashSet<>();
    for (Long id : ids) {
      if (!seen.add(id)) {
        throw invalid("Ảnh bị chọn hai lần: " + id + ".");
      }
    }
    Set<Long> existing =
        media.findAllById(ids).stream().map(Media::getId).collect(Collectors.toSet());
    for (Long id : ids) {
      if (!existing.contains(id)) {
        throw invalid("Ảnh không tồn tại: " + id + ".");
      }
    }
  }

  private static ApiException invalid(String detail) {
    return new ApiException(HttpStatus.BAD_REQUEST, detail);
  }
}
