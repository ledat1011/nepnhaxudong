package vn.nepnhaxudong.publicapi;

import java.util.List;
import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.common.LocalizedList;
import vn.nepnhaxudong.product.Product;
import vn.nepnhaxudong.product.ProductTranslation;

/** A product of the home page with its texts chosen by language. */
public record ProductPublicDto(
    String name,
    String description,
    List<String> features,
    String cookingTips,
    boolean showPrice,
    List<PackagingPublicDto> packagings,
    List<ImageRefDto> images) {

  static ProductPublicDto from(Product product, Lang lang, ImageRefs images) {
    var vi = product.translation(Lang.VI).orElseThrow();
    var en = product.translation(Lang.EN);
    List<PackagingPublicDto> packagings =
        product.getPackagings().stream()
            .map(
                pack ->
                    new PackagingPublicDto(
                        pack.getWeightGrams(), product.isShowPrice() ? pack.getPriceVnd() : null))
            .toList();
    return new ProductPublicDto(
        PublicText.pick(lang, vi.getName(), en.map(ProductTranslation::getName).orElse(null)),
        PublicText.pick(
            lang, vi.getDescription(), en.map(ProductTranslation::getDescription).orElse(null)),
        new LocalizedList(vi.getFeatures(), en.map(ProductTranslation::getFeatures).orElse(null))
            .resolve(lang),
        PublicText.pick(
            lang, vi.getCookingTips(), en.map(ProductTranslation::getCookingTips).orElse(null)),
        product.isShowPrice(),
        packagings,
        images.refs(product.mediaIds()));
  }
}
