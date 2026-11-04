package vn.nepnhaxudong.common;

import java.util.Locale;

/** A content language of the website. Vietnamese is always present; English may be missing. */
public enum Lang {
  VI("vi"),
  EN("en");

  private final String code;

  Lang(String code) {
    this.code = code;
  }

  /** The lower-case code used in URLs and in the {@code lang} columns of the database. */
  public String code() {
    return code;
  }

  /** Reads the language from a URL path segment; anything but "vi" or "en" answers 404. */
  public static Lang fromPath(String path) {
    if (path != null) {
      String normalized = path.toLowerCase(Locale.ROOT);
      for (Lang lang : values()) {
        if (lang.code.equals(normalized)) {
          return lang;
        }
      }
    }
    throw new UnknownLangException(path);
  }
}
