package vn.nepnhaxudong.story;

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

/** Story management in the admin area. Paths are relative to the context path {@code /api}. */
@RestController
@RequestMapping("/admin/stories")
public class StoryAdminController {

  private final StoryService service;

  public StoryAdminController(StoryService service) {
    this.service = service;
  }

  @GetMapping
  public List<StoryAdminDto> list() {
    return service.list();
  }

  @GetMapping("/{id}")
  public StoryAdminDto get(@PathVariable long id) {
    return service.get(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public StoryAdminDto create(@RequestBody StoryRequest body) {
    return service.create(body);
  }

  /** Replaces the whole story, except its status and publication date. */
  @PutMapping("/{id}")
  public StoryAdminDto update(@PathVariable long id, @RequestBody StoryRequest body) {
    return service.update(id, body);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable long id) {
    service.delete(id);
  }

  /** Answers 200 with the story, also when it was already published. */
  @PostMapping("/{id}/publish")
  public StoryAdminDto publish(@PathVariable long id) {
    return service.publish(id);
  }

  /** Answers 200 with the story, also when it was already a draft. */
  @PostMapping("/{id}/unpublish")
  public StoryAdminDto unpublish(@PathVariable long id) {
    return service.unpublish(id);
  }
}
