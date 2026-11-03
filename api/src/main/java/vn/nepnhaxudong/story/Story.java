package vn.nepnhaxudong.story;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.common.TimestampedEntity;

/**
 * A blog story. The texts are children owned by the story: they are created and removed only
 * through the methods here.
 */
@Entity
@Table(name = "story")
public class Story extends TimestampedEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private StoryStatus status = StoryStatus.DRAFT;

  @Column(name = "published_at")
  private Instant publishedAt;

  @Column(name = "cover_media_id")
  private Long coverMediaId;

  @OneToMany(mappedBy = "story", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<StoryTranslation> translations = new ArrayList<>();

  protected Story() {}

  public static Story create() {
    return new Story();
  }

  public Long getId() {
    return id;
  }

  public StoryStatus getStatus() {
    return status;
  }

  /** When the story was first published, or null when it never was. */
  public Instant getPublishedAt() {
    return publishedAt;
  }

  /** The cover image id, or null when the story has no cover. */
  public Long getCoverMediaId() {
    return coverMediaId;
  }

  public Optional<StoryTranslation> translation(Lang lang) {
    return translations.stream().filter(t -> t.isLang(lang)).findFirst();
  }

  void setCoverMediaId(Long coverMediaId) {
    this.coverMediaId = coverMediaId;
  }

  void setPublication(StoryStatus status, Instant publishedAt) {
    this.status = status;
    this.publishedAt = publishedAt;
  }

  /** Creates the text of the language when it does not exist, then sets it. */
  void putTranslation(Lang lang, String slug, String title, String excerpt, String bodyHtml) {
    StoryTranslation translation =
        translation(lang)
            .orElseGet(
                () -> {
                  var created = new StoryTranslation(this, lang);
                  translations.add(created);
                  return created;
                });
    translation.set(slug, title, excerpt, bodyHtml);
  }

  void removeTranslation(Lang lang) {
    translations.removeIf(t -> t.isLang(lang));
  }
}
