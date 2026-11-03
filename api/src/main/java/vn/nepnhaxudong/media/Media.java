package vn.nepnhaxudong.media;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import vn.nepnhaxudong.common.TimestampedEntity;

/** A stored image file. {@code path} is relative to the media folder, for example {@code 2031/01/<uuid>.jpg}. */
@Entity
@Table(name = "media")
public class Media extends TimestampedEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private String path;

  @Column(nullable = false)
  private String mime;

  @Column(nullable = false)
  private int width;

  @Column(nullable = false)
  private int height;

  @Column(name = "size_bytes", nullable = false)
  private long sizeBytes;

  @Column(name = "alt_vi", nullable = false)
  private String altVi;

  @Column(name = "alt_en", nullable = false)
  private String altEn;

  protected Media() {}

  public static Media create(
      String path,
      String mime,
      int width,
      int height,
      long sizeBytes,
      String altVi,
      String altEn) {
    var media = new Media();
    media.path = path;
    media.mime = mime;
    media.width = width;
    media.height = height;
    media.sizeBytes = sizeBytes;
    media.altVi = altVi;
    media.altEn = altEn;
    return media;
  }

  public void changeAltTexts(String altVi, String altEn) {
    this.altVi = altVi;
    this.altEn = altEn;
  }

  public Long getId() {
    return id;
  }

  public String getPath() {
    return path;
  }

  public String getMime() {
    return mime;
  }

  public int getWidth() {
    return width;
  }

  public int getHeight() {
    return height;
  }

  public long getSizeBytes() {
    return sizeBytes;
  }

  public String getAltVi() {
    return altVi;
  }

  public String getAltEn() {
    return altEn;
  }
}
