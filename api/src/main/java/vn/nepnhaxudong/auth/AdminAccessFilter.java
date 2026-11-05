package vn.nepnhaxudong.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.nepnhaxudong.common.ProblemJsonWriter;

/**
 * The gate of {@code /admin/**}, in this order, with the user read from the database on each
 * request (so a lock, a new role or a reset takes effect at once, also in an open session):
 *
 * <ol>
 *   <li>a user who must change the password gets 403 {@code must-change-password};
 *   <li>a user whose two-factor login was switched off by an owner gets 403 {@code must-setup-totp},
 *       except on the two calls that set it up again;
 *   <li>a member ("Người nhà") gets 403 {@code owner-required} on account management
 *       ({@code /admin/users/**}).
 * </ol>
 *
 * <p>It runs inside the security chain, before Spring MVC, so it also answers for paths with no
 * controller. It runs after the authorization filter, so only a logged-in user reaches it. {@link
 * UserAdminService} checks the role again inside its transaction.
 */
public class AdminAccessFilter extends OncePerRequestFilter {

  static final String MUST_CHANGE_PASSWORD = "Bạn cần đổi mật khẩu trước.";
  static final String MUST_SETUP_TOTP = "Bạn cần bật lại xác thực 2 lớp trước.";
  static final String OWNER_ONLY = "Chỉ Chủ được quản lý tài khoản.";

  private static final PathPatternRequestMatcher.Builder PATHS = PathPatternRequestMatcher.withDefaults();

  private final RequestMatcher adminArea = PATHS.matcher("/admin/**");
  private final RequestMatcher totpSetup =
      new OrRequestMatcher(PATHS.matcher("/admin/me/totp/setup"), PATHS.matcher("/admin/me/totp/enable"));
  private final RequestMatcher accounts =
      new OrRequestMatcher(PATHS.matcher("/admin/users"), PATHS.matcher("/admin/users/**"));
  private final LoginService loginService;

  public AdminAccessFilter(LoginService loginService) {
    this.loginService = loginService;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    return !adminArea.matches(request);
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication != null && authentication.getPrincipal() instanceof SessionPrincipal principal) {
      AppUser user;
      try {
        user = loginService.requireActive(principal.userId());
      } catch (SessionExpiredException e) {
        // The user was deleted or disabled: end the session, as GET /auth/me does.
        HttpSession session = request.getSession(false);
        if (session != null) {
          session.invalidate();
        }
        SecurityContextHolder.clearContext();
        ProblemJsonWriter.write(response, e.getStatus(), e.getMessage(), e.getCode());
        return;
      }
      if (user.isMustChangePassword()) {
        ProblemJsonWriter.write(
            response, HttpStatus.FORBIDDEN, MUST_CHANGE_PASSWORD, ProblemCodes.MUST_CHANGE_PASSWORD);
        return;
      }
      if (user.isMustSetupTotp() && !totpSetup.matches(request)) {
        ProblemJsonWriter.write(
            response, HttpStatus.FORBIDDEN, MUST_SETUP_TOTP, ProblemCodes.MUST_SETUP_TOTP);
        return;
      }
      if (!user.isOwner() && accounts.matches(request)) {
        ProblemJsonWriter.write(response, HttpStatus.FORBIDDEN, OWNER_ONLY, ProblemCodes.OWNER_REQUIRED);
        return;
      }
    }
    chain.doFilter(request, response);
  }
}
