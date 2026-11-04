package vn.nepnhaxudong.press;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/** Press management in the admin area. Paths are relative to the context path {@code /api}. */
@RestController
@RequestMapping("/admin/press")
public class PressAdminController {

  private final PressService service;
  private final PressPreviewService previewService;
  private final JsonMapper json;

  public PressAdminController(
      PressService service, PressPreviewService previewService, JsonMapper json) {
    this.service = service;
    this.previewService = previewService;
    this.json = json;
  }

  @GetMapping
  public List<PressMentionAdminDto> list() {
    return service.list();
  }

  @GetMapping("/{id}")
  public PressMentionAdminDto get(@PathVariable long id) {
    return service.get(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public PressMentionAdminDto create(@RequestBody PressMentionRequest body) {
    return service.create(body);
  }

  /** Replaces the whole mention. */
  @PutMapping("/{id}")
  public PressMentionAdminDto update(@PathVariable long id, @RequestBody PressMentionRequest body) {
    return service.update(id, body);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable long id) {
    service.delete(id);
  }

  /**
   * Reads title, date and site name of an article page. A failure gives null fields, no error.
   * The body is read as text and parsed here: a missing body or a body that is not JSON is also a
   * failure of the preview (null fields), not a 400.
   */
  @PostMapping("/preview")
  public PressPreviewDto preview(@RequestBody(required = false) String body) {
    return previewService.preview(urlOf(body));
  }

  private String urlOf(String body) {
    if (body == null || body.isBlank()) {
      return null;
    }
    try {
      PressPreviewRequest request = json.readValue(body, PressPreviewRequest.class);
      return request == null ? null : request.url();
    } catch (JacksonException e) {
      return null;
    }
  }
}
