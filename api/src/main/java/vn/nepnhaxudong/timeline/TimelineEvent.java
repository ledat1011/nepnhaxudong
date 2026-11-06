package vn.nepnhaxudong.timeline;

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
 * One milestone of the family story. The texts and the image links are children owned by the
 * event: they are created, changed and removed only through the methods here.
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

  @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<TimelineEventTranslation> translations = new ArrayList<>();

  @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("sortOrder, id")
  private List<TimelineEventMedia> media = new ArrayList<>();

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

  /** The image ids in display order. */
  public List<Long> mediaIds() {
    return media.stream().map(TimelineEventMedia::getMediaId).toList();
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

  /**
   * Makes the images equal to the list (the ids must be distinct); the position in the list becomes
   * the sort order. A row that stays is updated in place, because (event, media) is unique and a
   * delete plus insert of the same pair in one flush would break that rule.
   */
  void replaceMedia(List<Long> wantedIds) {
    var existing =
        media.stream()
            .collect(Collectors.toMap(TimelineEventMedia::getMediaId, Function.identity()));
    media.removeIf(row -> !wantedIds.contains(row.getMediaId()));
    for (int i = 0; i < wantedIds.size(); i++) {
      long mediaId = wantedIds.get(i);
      TimelineEventMedia row = existing.get(mediaId);
      if (row == null) {
        media.add(new TimelineEventMedia(this, mediaId, i));
      } else {
        row.setSortOrder(i);
      }
    }
    media.sort(Comparator.comparingInt(TimelineEventMedia::getSortOrder));
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
