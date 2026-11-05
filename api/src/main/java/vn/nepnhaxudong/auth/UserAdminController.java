package vn.nepnhaxudong.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
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

/**
 * Family account management in the admin area, for owners ("Chủ") only: {@link AdminAccessFilter}
 * answers 403 to a member, and {@link UserAdminService} checks the role again. Paths are relative to
 * the context path {@code /api}.
 */
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
  public UserSummary create(
      @AuthenticationPrincipal SessionPrincipal principal, @Valid @RequestBody CreateUserRequest body) {
    return service.create(principal.userId(), body);
  }

  @PostMapping("/{id}/disable")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void disable(@AuthenticationPrincipal SessionPrincipal principal, @PathVariable long id) {
    service.disable(principal.userId(), id);
  }

  @PostMapping("/{id}/enable")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void enable(@AuthenticationPrincipal SessionPrincipal principal, @PathVariable long id) {
    service.enable(principal.userId(), id);
  }

  @PostMapping("/{id}/reset-password")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void resetPassword(
      @AuthenticationPrincipal SessionPrincipal principal,
      @PathVariable long id,
      @Valid @RequestBody ResetPasswordRequest body) {
    service.resetPassword(principal.userId(), id, body.temporaryPassword());
  }

  /** Makes the user an owner or a member. */
  @PostMapping("/{id}/role")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void changeRole(
      @AuthenticationPrincipal SessionPrincipal principal,
      @PathVariable long id,
      @Valid @RequestBody ChangeRoleRequest body,
      HttpServletRequest request) {
    HttpSession session = request.getSession(false);
    service.changeRole(principal.userId(), id, body.role(), session == null ? null : session.getId());
  }

  /** Switches off the two-factor login of another user, who must set it up again. */
  @PostMapping("/{id}/disable-totp")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void disableTotp(@AuthenticationPrincipal SessionPrincipal principal, @PathVariable long id) {
    service.disableTotp(principal.userId(), id);
  }
}
