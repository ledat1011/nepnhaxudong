package vn.nepnhaxudong.timeline;

import jakarta.validation.Valid;
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

/** Timeline management in the admin area. Paths are relative to the context path {@code /api}. */
@RestController
@RequestMapping("/admin/timeline")
public class TimelineAdminController {

  private final TimelineService service;

  public TimelineAdminController(TimelineService service) {
    this.service = service;
  }

  @GetMapping
  public List<TimelineEventAdminDto> list() {
    return service.list();
  }

  @GetMapping("/{id}")
  public TimelineEventAdminDto get(@PathVariable long id) {
    return service.get(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public TimelineEventAdminDto create(@Valid @RequestBody TimelineEventRequest body) {
    return service.create(body);
  }

  /** Replaces the whole event. */
  @PutMapping("/{id}")
  public TimelineEventAdminDto update(
      @PathVariable long id, @Valid @RequestBody TimelineEventRequest body) {
    return service.update(id, body);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable long id) {
    service.delete(id);
  }

  /** Sorts the events by the order of the ids in the body. */
  @PutMapping("/order")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void reorder(@RequestBody TimelineOrderRequest body) {
    service.reorder(body.ids());
  }
}
