package vn.nepnhaxudong.auth;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Family account management in the admin area. Paths are relative to the context path {@code /api}. */
@RestController
@RequestMapping("/admin/users")
public class UserAdminController {

  private final UserAdminService service;

  public UserAdminController(UserAdminService service) {
    this.service = service;
  }

  @GetMapping
  public List<UserSummary> list() {
    return service.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public UserSummary create(@Valid @RequestBody CreateUserRequest body) {
    return service.create(body);
  }

  @PostMapping("/{id}/disable")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void disable(@AuthenticationPrincipal SessionPrincipal principal, @PathVariable long id) {
    service.disable(principal.userId(), id);
  }

  @PostMapping("/{id}/enable")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void enable(@PathVariable long id) {
    service.enable(id);
  }

  @PostMapping("/{id}/reset-password")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void resetPassword(@PathVariable long id, @Valid @RequestBody ResetPasswordRequest body) {
    service.resetPassword(id, body.temporaryPassword());
  }
}
