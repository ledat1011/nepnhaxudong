package vn.nepnhaxudong.common;

import java.util.List;
import java.util.Objects;

/**
 * A list of texts in both content languages, for example product features. Blank items are
 * dropped. An empty English list means the English version is missing.
 */
public record LocalizedList(List<String> vi, List<String> en) {

  public LocalizedList {
    vi = clean(vi);
    en = clean(en);
  }

  /** The English list when the language is English and it is not empty, otherwise the Vietnamese list. */
  public List<String> resolve(Lang lang) {
    return lang == Lang.EN && !en.isEmpty() ? en : vi;
  }

  public boolean missingEn() {
    return en.isEmpty();
  }

  private static List<String> clean(List<String> items) {
    if (items == null) {
      return List.of();
    }
    return items.stream().filter(Objects::nonNull).filter(item -> !item.isBlank()).toList();
  }
}
