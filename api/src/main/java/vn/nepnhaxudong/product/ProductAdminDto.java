package vn.nepnhaxudong.product;

import java.util.List;
import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.common.LocalizedList;
import vn.nepnhaxudong.common.LocalizedText;

/**
 * A product as the admin sees it, with both languages. {@code missingEn} is true when a field that
 * has a Vietnamese text has no English text. {@code visible} is the "Hiện trên web" switch. It is
 * also the snapshot kept in the audit log.
 */
public record ProductAdminDto(
    long id,
    int sortOrder,
    boolean showPrice,
    Boolean visible,
    LocalizedText name,
    LocalizedText description,
    LocalizedList features,
    LocalizedText cookingTips,
    List<PackagingDto> packagings,
    List<Long> mediaIds,
    boolean missingEn) {

  /**
   * An audit snapshot written before migration V3 has no {@code visible}. Every product was on the
   * website then, so a missing value means visible.
   */
  public ProductAdminDto {
    visible = visible == null || visible;
  }

  static ProductAdminDto from(Product product) {
    var vi = product.translation(Lang.VI).orElseThrow();
    var en = product.translation(Lang.EN);
    var name = new LocalizedText(vi.getName(), en.map(ProductTranslation::getName).orElse(null));
    var description =
        new LocalizedText(
            vi.getDescription(), en.map(ProductTranslation::getDescription).orElse(null));
    var features =
        new LocalizedList(
            vi.getFeatures(), en.map(ProductTranslation::getFeatures).orElse(List.of()));
    var cookingTips =
        new LocalizedText(
            vi.getCookingTips(), en.map(ProductTranslation::getCookingTips).orElse(null));
    boolean missingEn =
        name.missingEn()
            || features.missingEn()
            || (description.vi() != null && description.missingEn())
            || (cookingTips.vi() != null && cookingTips.missingEn());
    return new ProductAdminDto(
        product.getId(),
        product.getSortOrder(),
        product.isShowPrice(),
        product.isVisible(),
        name,
        description,
        features,
        cookingTips,
        product.getPackagings().stream()
            .map(p -> new PackagingDto(p.getWeightGrams(), p.getPriceVnd(), p.getSortOrder()))
            .toList(),
        product.mediaIds(),
        missingEn);
  }
}
