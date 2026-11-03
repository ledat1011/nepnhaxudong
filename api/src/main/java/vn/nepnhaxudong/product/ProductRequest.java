package vn.nepnhaxudong.product;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.util.List;
import vn.nepnhaxudong.common.LocalizedList;
import vn.nepnhaxudong.common.LocalizedText;

/**
 * The body of POST and PUT. A PUT replaces the whole product, including its pack sizes and images.
 * The texts are checked by {@link ProductService} because their messages name the field.
 */
public record ProductRequest(
    Integer sortOrder,
    Boolean showPrice,
    LocalizedText name,
    LocalizedText description,
    LocalizedList features,
    LocalizedText cookingTips,
    @Size(max = ProductRequest.MAX_PACKAGINGS, message = "Một sản phẩm có tối đa 20 quy cách.")
        List<@Valid PackagingDto> packagings,
    @Size(max = ProductRequest.MAX_IMAGES, message = "Một sản phẩm có tối đa 30 ảnh.")
        List<Long> mediaIds) {

  static final int MAX_PACKAGINGS = 20;
  static final int MAX_IMAGES = 30;

  public ProductRequest {
    sortOrder = sortOrder == null ? 0 : sortOrder;
    showPrice = showPrice != null && showPrice;
    description = description == null ? new LocalizedText(null, null) : description;
    features = features == null ? new LocalizedList(null, null) : features;
    cookingTips = cookingTips == null ? new LocalizedText(null, null) : cookingTips;
    packagings = packagings == null ? List.of() : packagings;
    mediaIds = mediaIds == null ? List.of() : mediaIds;
  }
}
