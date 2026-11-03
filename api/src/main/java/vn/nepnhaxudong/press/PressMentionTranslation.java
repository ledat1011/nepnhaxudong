package vn.nepnhaxudong.press;

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

/** The title of a press mention in one language. Created and removed only through the mention. */
@Entity
@Table(name = "press_mention_translation")
public class PressMentionTranslation {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "press_mention_id", nullable = false)
  private PressMention mention;

  @Column(nullable = false)
  private String lang;

  @Column(nullable = false)
  private String title;

  protected PressMentionTranslation() {}

  PressMentionTranslation(PressMention mention, Lang lang) {
    this.mention = mention;
    this.lang = lang.code();
  }

  void setTitle(String title) {
    this.title = title;
  }

  boolean isLang(Lang other) {
    return lang.equals(other.code());
  }

  public String getTitle() {
    return title;
  }
}
