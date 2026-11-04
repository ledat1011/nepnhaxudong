package vn.nepnhaxudong.common;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/** Turns a title into the readable part of a web address, for example "cau-chuyen-mua-gat". */
public final class SlugGenerator {

  /** The longest slug that is produced. */
  public static final int MAX_LENGTH = 80;

  private static final Pattern COMBINING_MARKS = Pattern.compile("\\p{M}+");
  private static final Pattern NOT_LETTER_OR_DIGIT = Pattern.compile("[^a-z0-9]+");

  private SlugGenerator() {}

  /**
   * Removes Vietnamese marks, writes lower-case letters and digits, and joins words with one dash.
   * The result has no dash at either end and at most {@value #MAX_LENGTH} characters. It is empty
   * when the text has no letter or digit (for example only emoji); the caller must handle that.
   */
  public static String slugify(String text) {
    if (text == null) {
      return "";
    }
    String plain =
        COMBINING_MARKS
            .matcher(Normalizer.normalize(text, Normalizer.Form.NFD))
            .replaceAll("")
            .replace('đ', 'd')
            .replace('Đ', 'D')
            .toLowerCase(Locale.ROOT);
    String slug = trimDashes(NOT_LETTER_OR_DIGIT.matcher(plain).replaceAll("-"));
    if (slug.length() > MAX_LENGTH) {
      slug = trimDashes(slug.substring(0, MAX_LENGTH));
    }
    return slug;
  }

  private static String trimDashes(String text) {
    int start = 0;
    int end = text.length();
    while (start < end && text.charAt(start) == '-') {
      start++;
    }
    while (end > start && text.charAt(end - 1) == '-') {
      end--;
    }
    return text.substring(start, end);
  }
}
