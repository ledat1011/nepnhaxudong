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

/** Links a product to one of its images; the order of the images is {@code sortOrder}. */
@Entity
@Table(name = "product_media")
public class ProductMedia extends TimestampedEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "product_id", nullable = false)
  private Product product;

  @Column(name = "media_id", nullable = false)
  private long mediaId;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  protected ProductMedia() {}

  ProductMedia(Product product, long mediaId, int sortOrder) {
    this.product = product;
    this.mediaId = mediaId;
    this.sortOrder = sortOrder;
  }

  void setSortOrder(int sortOrder) {
    this.sortOrder = sortOrder;
  }

  public long getMediaId() {
    return mediaId;
  }

  public int getSortOrder() {
    return sortOrder;
  }
}
