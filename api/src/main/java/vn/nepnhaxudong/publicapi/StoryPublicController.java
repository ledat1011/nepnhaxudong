package vn.nepnhaxudong.publicapi;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.nepnhaxudong.common.ApiException;
import vn.nepnhaxudong.common.Lang;

/** The public blog: a list by page and one story by slug. No login is needed. */
@RestController
@RequestMapping("/public/{lang}/stories")
public class StoryPublicController {

  static final String BAD_PAGE = "Số trang không hợp lệ.";

  private final PublicContentService content;

  public StoryPublicController(PublicContentService content) {
    this.content = content;
  }

  /**
   * Twelve stories per page, newest first. Pages count from 0. The page is read as text so that a
   * wrong value gets the same Vietnamese answer as a negative one.
   */
  @GetMapping
  public List<StorySummaryDto> list(
      @PathVariable String lang, @RequestParam(defaultValue = "0") String page) {
    Lang language = Lang.fromPath(lang);
    return content.stories(language, parsePage(page));
  }

  @GetMapping("/{slug}")
  public StoryDetailDto get(@PathVariable String lang, @PathVariable String slug) {
    return content.story(Lang.fromPath(lang), slug);
  }

  private static long parsePage(String text) {
    try {
      long page = Long.parseLong(text);
      if (page >= 0) {
        return page;
      }
    } catch (NumberFormatException e) {
      // The same answer as for a negative number.
    }
    throw new ApiException(HttpStatus.BAD_REQUEST, BAD_PAGE);
  }
}
