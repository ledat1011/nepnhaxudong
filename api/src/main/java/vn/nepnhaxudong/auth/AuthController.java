package vn.nepnhaxudong.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

  static final String ROLE_ADMIN = "ROLE_ADMIN";

  private final LoginService loginService;
  private final PasswordChangeService passwordChangeService;
  private final SecurityContextRepository securityContextRepository;
  private final CsrfTokenRepository csrfTokenRepository;

  public AuthController(
      LoginService loginService,
      PasswordChangeService passwordChangeService,
      SecurityContextRepository securityContextRepository,
      CsrfTokenRepository csrfTokenRepository) {
    this.loginService = loginService;
    this.passwordChangeService = passwordChangeService;
    this.securityContextRepository = securityContextRepository;
    this.csrfTokenRepository = csrfTokenRepository;
  }

  @PostMapping("/login")
  public UserResponse login(
      @Valid @RequestBody LoginRequest body,
      HttpServletRequest request,
      HttpServletResponse response) {
    AppUser user = loginService.authenticate(body.email(), body.password(), body.totpCode());

    // Session fixation protection: a session id that existed before the login is never reused.
    if (request.getSession(false) != null) {
      request.changeSessionId();
    }
    var authentication =
        UsernamePasswordAuthenticationToken.authenticated(
            new SessionPrincipal(user.getId(), user.getEmail()),
            null,
            List.of(new SimpleGrantedAuthority(ROLE_ADMIN)));
    SecurityContext context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(authentication);
    SecurityContextHolder.setContext(context);
    securityContextRepository.saveContext(context, request, response);
    // A CSRF token seen before the login must not be valid after it.
    rotateCsrfToken(request, response);
    return UserResponse.of(user);
  }

  @PostMapping("/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void logout(HttpServletRequest request, HttpServletResponse response) {
    invalidateSession(request);
    SecurityContextHolder.clearContext();
    rotateCsrfToken(request, response);
  }

  @GetMapping("/me")
  public UserResponse me(
      @AuthenticationPrincipal SessionPrincipal principal, HttpServletRequest request) {
    try {
      return UserResponse.of(loginService.requireActive(principal.userId()));
    } catch (SessionExpiredException e) {
      invalidateSession(request);
      throw e;
    }
  }

  @PostMapping("/password")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void changePassword(
      @AuthenticationPrincipal SessionPrincipal principal,
      @Valid @RequestBody PasswordChangeRequest body,
      HttpServletRequest request) {
    // The other sessions of this user end inside the service; this one stays and gets a new id.
    passwordChangeService.change(
        principal.userId(),
        body.currentPassword(),
        body.newPassword(),
        request.getSession().getId());
    request.changeSessionId();
  }

  /**
   * Returns the CSRF token. Reading the token also makes Spring Security set the XSRF-TOKEN cookie
   * (the token is created lazily), so a client calls this once before its first write request.
   */
  @GetMapping("/csrf")
  public CsrfResponse csrf(CsrfToken token) {
    return new CsrfResponse(token.getHeaderName(), token.getToken());
  }

  /** Removes the CSRF cookie and sets a new random token; the client reads it with GET /auth/csrf. */
  private void rotateCsrfToken(HttpServletRequest request, HttpServletResponse response) {
    csrfTokenRepository.saveToken(null, request, response);
    csrfTokenRepository.saveToken(csrfTokenRepository.generateToken(request), request, response);
  }

  private static void invalidateSession(HttpServletRequest request) {
    HttpSession session = request.getSession(false);
    if (session != null) {
      session.invalidate();
    }
  }
}
