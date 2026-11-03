package vn.nepnhaxudong.story;

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

/** The text of a story in one language. Created and removed only through the story. */
@Entity
@Table(name = "story_translation")
public class StoryTranslation {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "story_id", nullable = false)
  private Story story;

  @Column(nullable = false)
  private String lang;

  @Column(nullable = false)
  private String slug;

  @Column(nullable = false)
  private String title;

  private String excerpt;

  @Column(name = "body_html", nullable = false)
  private String bodyHtml = "";

  protected StoryTranslation() {}

  StoryTranslation(Story story, Lang lang) {
    this.story = story;
    this.lang = lang.code();
  }

  void set(String slug, String title, String excerpt, String bodyHtml) {
    this.slug = slug;
    this.title = title;
    this.excerpt = excerpt;
    this.bodyHtml = bodyHtml;
  }

  boolean isLang(Lang other) {
    return lang.equals(other.code());
  }

  public String getSlug() {
    return slug;
  }

  public String getTitle() {
    return title;
  }

  public String getExcerpt() {
    return excerpt;
  }

  public String getBodyHtml() {
    return bodyHtml;
  }
}
