package vn.nepnhaxudong.timeline;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.common.TimestampedEntity;

/**
 * One milestone of the family story. The texts are children owned by the event: they are created
 * and removed only through the methods here.
 */
@Entity
@Table(name = "timeline_event")
public class TimelineEvent extends TimestampedEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  // The Java name is not "year": that word is a function name in HQL.
  @Column(name = "year", nullable = false)
  private int eventYear;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @Column(name = "media_id")
  private Long mediaId;

  @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<TimelineEventTranslation> translations = new ArrayList<>();

  protected TimelineEvent() {}

  public static TimelineEvent create() {
    return new TimelineEvent();
  }

  public Long getId() {
    return id;
  }

  public int getEventYear() {
    return eventYear;
  }

  public int getSortOrder() {
    return sortOrder;
  }

  /** The image id, or null when the event has no image. */
  public Long getMediaId() {
    return mediaId;
  }

  public Optional<TimelineEventTranslation> translation(Lang lang) {
    return translations.stream().filter(t -> t.isLang(lang)).findFirst();
  }

  void setEventYear(int eventYear) {
    this.eventYear = eventYear;
  }

  void setSortOrder(int sortOrder) {
    this.sortOrder = sortOrder;
  }

  void setMediaId(Long mediaId) {
    this.mediaId = mediaId;
  }

  /** Creates the translation of the language when it does not exist, then sets its texts. */
  void putTranslation(Lang lang, String title, String description) {
    TimelineEventTranslation translation =
        translation(lang)
            .orElseGet(
                () -> {
                  var created = new TimelineEventTranslation(this, lang);
                  translations.add(created);
                  return created;
                });
    translation.set(title, description);
  }

  void removeTranslation(Lang lang) {
    translations.removeIf(t -> t.isLang(lang));
  }
}
