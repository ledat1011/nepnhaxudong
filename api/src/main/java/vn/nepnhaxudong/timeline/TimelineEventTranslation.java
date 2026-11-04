package vn.nepnhaxudong.timeline;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import vn.nepnhaxudong.common.Lang;

/** The text of a timeline event in one language. Created and removed only through the event. */
@Entity
@Table(name = "timeline_event_translation")
public class TimelineEventTranslation {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "timeline_event_id", nullable = false)
  private TimelineEvent event;

  @Column(nullable = false)
  private String lang;

  @Column(nullable = false)
  private String title;

  private String description;

  protected TimelineEventTranslation() {}

  TimelineEventTranslation(TimelineEvent event, Lang lang) {
    this.event = event;
    this.lang = lang.code();
  }

  void set(String title, String description) {
    this.title = title;
    this.description = description;
  }

  boolean isLang(Lang other) {
    return lang.equals(other.code());
  }

  public String getTitle() {
    return title;
  }

  public String getDescription() {
    return description;
  }
}
