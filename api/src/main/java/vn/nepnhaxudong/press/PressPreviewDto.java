package vn.nepnhaxudong.press;

import java.time.LocalDate;

/** What the meta tags of an article page say. A field is null when the page does not have it. */
public record PressPreviewDto(String title, LocalDate publishedOn, String sourceName) {

  static final PressPreviewDto EMPTY = new PressPreviewDto(null, null, null);
}
