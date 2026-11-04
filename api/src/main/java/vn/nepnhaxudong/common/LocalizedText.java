package vn.nepnhaxudong.common;

/**
 * A text in both content languages. A blank value is stored as {@code null} (never as an empty
 * string), so "missing" always means {@code null}. The caller decides whether {@code vi} is
 * required; for a required field it checks {@code vi() != null}.
 */
public record LocalizedText(String vi, String en) {

  public LocalizedText {
    vi = blankToNull(vi);
    en = blankToNull(en);
  }

  /** The English text when the language is English and it exists, otherwise the Vietnamese text. */
  public String resolve(Lang lang) {
    return lang == Lang.EN && en != null ? en : vi;
  }

  public boolean missingEn() {
    return en == null;
  }

  private static String blankToNull(String text) {
    return text == null || text.isBlank() ? null : text;
  }
}
