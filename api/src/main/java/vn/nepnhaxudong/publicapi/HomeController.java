package vn.nepnhaxudong.publicapi;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.nepnhaxudong.common.Lang;

/**
 * The public data of the home page. No login is needed. Paths are relative to the context path
 * {@code /api}; a language other than {@code vi} or {@code en} is 404.
 */
@RestController
@RequestMapping("/public/{lang}")
public class HomeController {

  private final PublicContentService content;

  public HomeController(PublicContentService content) {
    this.content = content;
  }

  @GetMapping("/home")
  public HomeDto home(@PathVariable String lang) {
    return content.home(Lang.fromPath(lang));
  }
}
