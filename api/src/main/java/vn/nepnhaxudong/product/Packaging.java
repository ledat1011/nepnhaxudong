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
import vn.nepnhaxudong.common.TimestampedEntity;

/** One pack size of a product. The price is optional; null means there is no listed price. */
@Entity
@Table(name = "packaging")
public class Packaging extends TimestampedEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "product_id", nullable = false)
  private Product product;

  @Column(name = "weight_grams", nullable = false)
  private int weightGrams;

  @Column(name = "price_vnd")
  private Long priceVnd;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  protected Packaging() {}

  Packaging(Product product) {
    this.product = product;
  }

  void set(int weightGrams, Long priceVnd, int sortOrder) {
    this.weightGrams = weightGrams;
    this.priceVnd = priceVnd;
    this.sortOrder = sortOrder;
  }

  public int getWeightGrams() {
    return weightGrams;
  }

  public Long getPriceVnd() {
    return priceVnd;
  }

  public int getSortOrder() {
    return sortOrder;
  }
}
