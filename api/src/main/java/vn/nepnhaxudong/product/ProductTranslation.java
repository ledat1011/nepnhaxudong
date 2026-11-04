package vn.nepnhaxudong.product;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.List;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import vn.nepnhaxudong.common.Lang;

/** The text of a product in one language. Created and removed only through {@link Product}. */
@Entity
@Table(name = "product_translation")
public class ProductTranslation {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "product_id", nullable = false)
  private Product product;

  @Column(nullable = false)
  private String lang;

  @Column(nullable = false)
  private String name;

  private String description;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false)
  private List<String> features;

  @Column(name = "cooking_tips")
  private String cookingTips;

  protected ProductTranslation() {}

  ProductTranslation(Product product, Lang lang) {
    this.product = product;
    this.lang = lang.code();
  }

  void set(String name, String description, List<String> features, String cookingTips) {
    this.name = name;
    this.description = description;
    this.features = List.copyOf(features);
    this.cookingTips = cookingTips;
  }

  boolean isLang(Lang other) {
    return lang.equals(other.code());
  }

  public String getName() {
    return name;
  }

  public String getDescription() {
    return description;
  }

  public List<String> getFeatures() {
    return features;
  }

  public String getCookingTips() {
    return cookingTips;
  }
}
