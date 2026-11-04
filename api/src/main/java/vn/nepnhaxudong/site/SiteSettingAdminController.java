package vn.nepnhaxudong.site;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;

/**
 * Site settings in the admin area. The keys are {@code contact}, {@code social} and {@code brand};
 * any other key is 404. Paths are relative to the context path {@code /api}.
 */
@RestController
@RequestMapping("/admin/settings")
public class SiteSettingAdminController {

  private final SiteSettingService service;

  public SiteSettingAdminController(SiteSettingService service) {
    this.service = service;
  }

  /** The saved value, or the empty value (every field null) when the key was never saved. */
  @GetMapping("/{key}")
  public SiteSettingValue get(@PathVariable String key) {
    return service.get(SiteSettingKey.fromPath(key));
  }

  /** Replaces the whole value of the key. */
  @PutMapping("/{key}")
  public SiteSettingValue put(@PathVariable String key, @RequestBody JsonNode body) {
    return service.update(SiteSettingKey.fromPath(key), body);
  }
}
