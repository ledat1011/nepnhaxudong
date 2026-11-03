package vn.nepnhaxudong.press;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.common.TimestampedEntity;

/**
 * A newspaper article that wrote about the family. The titles are children owned by the mention:
 * they are created and removed only through the methods here.
 */
@Entity
@Table(name = "press_mention")
public class PressMention extends TimestampedEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private String url;

  @Column(name = "source_name", nullable = false)
  private String sourceName;

  @Column(name = "published_on")
  private LocalDate publishedOn;

  @Column(name = "media_id")
  private Long mediaId;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @OneToMany(mappedBy = "mention", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<PressMentionTranslation> translations = new ArrayList<>();

  protected PressMention() {}

  public static PressMention create() {
    return new PressMention();
  }

  public Long getId() {
    return id;
  }

  public String getUrl() {
    return url;
  }

  public String getSourceName() {
    return sourceName;
  }

  /** The publication date, or null when it is not known. */
  public LocalDate getPublishedOn() {
    return publishedOn;
  }

  /** The image id, or null when the mention has no image. */
  public Long getMediaId() {
    return mediaId;
  }

  public int getSortOrder() {
    return sortOrder;
  }

  public Optional<PressMentionTranslation> translation(Lang lang) {
    return translations.stream().filter(t -> t.isLang(lang)).findFirst();
  }

  void setFields(
      String url, String sourceName, LocalDate publishedOn, Long mediaId, int sortOrder) {
    this.url = url;
    this.sourceName = sourceName;
    this.publishedOn = publishedOn;
    this.mediaId = mediaId;
    this.sortOrder = sortOrder;
  }

  /** Creates the title of the language when it does not exist, then sets its text. */
  void putTitle(Lang lang, String title) {
    PressMentionTranslation translation =
        translation(lang)
            .orElseGet(
                () -> {
                  var created = new PressMentionTranslation(this, lang);
                  translations.add(created);
                  return created;
                });
    translation.setTitle(title);
  }

  void removeTitle(Lang lang) {
    translations.removeIf(t -> t.isLang(lang));
  }
}
