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

/** Press management in the admin area. Paths are relative to the context path {@code /api}. */
@RestController
@RequestMapping("/admin/press")
public class PressAdminController {

  private final PressService service;
  private final PressPreviewService previewService;

  public PressAdminController(PressService service, PressPreviewService previewService) {
    this.service = service;
    this.previewService = previewService;
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

  /** Reads the title, date and site name of an article page. A failure gives null fields, not an error. */
  @PostMapping("/preview")
  public PressPreviewDto preview(@RequestBody PressPreviewRequest body) {
    return previewService.preview(body.url());
  }
}
