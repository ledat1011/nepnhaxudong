package vn.nepnhaxudong.auth;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Two-factor login settings of the logged-in user. */
@RestController
@RequestMapping("/admin/me/totp")
public class TotpController {

  private final TotpService service;

  public TotpController(TotpService service) {
    this.service = service;
  }

  @PostMapping("/setup")
  public TotpSetupResponse setup(@AuthenticationPrincipal SessionPrincipal principal) {
    return service.setup(principal.userId());
  }

  @PostMapping("/enable")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void enable(
      @AuthenticationPrincipal SessionPrincipal principal, @Valid @RequestBody TotpCodeRequest body) {
    service.enable(principal.userId(), body.code());
  }

  @PostMapping("/disable")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void disable(
      @AuthenticationPrincipal SessionPrincipal principal, @Valid @RequestBody TotpCodeRequest body) {
    service.disable(principal.userId(), body.code());
  }
}
