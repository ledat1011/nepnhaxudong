package vn.nepnhaxudong.product;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.common.TimestampedEntity;

/**
 * A product with its texts, pack sizes and images. The children are owned by the product: they are
 * created, changed and removed only through the methods here.
 */
@Entity
@Table(name = "product")
public class Product extends TimestampedEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @Column(name = "show_price", nullable = false)
  private boolean showPrice;

  @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<ProductTranslation> translations = new ArrayList<>();

  @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("sortOrder, id")
  private List<Packaging> packagings = new ArrayList<>();

  @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("sortOrder, id")
  private List<ProductMedia> media = new ArrayList<>();

  protected Product() {}

  public static Product create() {
    return new Product();
  }

  public Long getId() {
    return id;
  }

  public int getSortOrder() {
    return sortOrder;
  }

  public void setSortOrder(int sortOrder) {
    this.sortOrder = sortOrder;
  }

  public boolean isShowPrice() {
    return showPrice;
  }

  public void setShowPrice(boolean showPrice) {
    this.showPrice = showPrice;
  }

  public Optional<ProductTranslation> translation(Lang lang) {
    return translations.stream().filter(t -> t.isLang(lang)).findFirst();
  }

  public List<Packaging> getPackagings() {
    return List.copyOf(packagings);
  }

  /** The image ids in display order. */
  public List<Long> mediaIds() {
    return media.stream().map(ProductMedia::getMediaId).toList();
  }

  /** Creates the translation of the language when it does not exist, then sets its texts. */
  void putTranslation(
      Lang lang, String name, String description, List<String> features, String cookingTips) {
    ProductTranslation translation =
        translation(lang)
            .orElseGet(
                () -> {
                  var created = new ProductTranslation(this, lang);
                  translations.add(created);
                  return created;
                });
    translation.set(name, description, features, cookingTips);
  }

  void removeTranslation(Lang lang) {
    translations.removeIf(t -> t.isLang(lang));
  }

  /** Makes the pack sizes equal to the list; the position in the list becomes the sort order. */
  void replacePackagings(List<PackagingDto> wanted) {
    for (int i = 0; i < wanted.size(); i++) {
      PackagingDto dto = wanted.get(i);
      if (i < packagings.size()) {
        packagings.get(i).set(dto.weightGrams(), dto.priceVnd(), i);
      } else {
        var added = new Packaging(this);
        added.set(dto.weightGrams(), dto.priceVnd(), i);
        packagings.add(added);
      }
    }
    while (packagings.size() > wanted.size()) {
      packagings.remove(packagings.size() - 1);
    }
  }

  /**
   * Makes the images equal to the list (the ids must be distinct); the position in the list becomes
   * the sort order. A row that stays is updated in place, because (product, media) is unique and a
   * delete plus insert of the same pair in one flush would break that rule.
   */
  void replaceMedia(List<Long> wantedIds) {
    var existing =
        media.stream().collect(Collectors.toMap(ProductMedia::getMediaId, Function.identity()));
    media.removeIf(row -> !wantedIds.contains(row.getMediaId()));
    for (int i = 0; i < wantedIds.size(); i++) {
      long mediaId = wantedIds.get(i);
      ProductMedia row = existing.get(mediaId);
      if (row == null) {
        media.add(new ProductMedia(this, mediaId, i));
      } else {
        row.setSortOrder(i);
      }
    }
    media.sort(Comparator.comparingInt(ProductMedia::getSortOrder));
  }
}
