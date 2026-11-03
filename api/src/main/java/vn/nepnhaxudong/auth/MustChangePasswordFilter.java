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
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.nepnhaxudong.common.ProblemJsonWriter;

/**
 * Keeps a user who must change the password out of {@code /admin/**}. It runs inside the security
 * chain, before Spring MVC, so it answers 403 for every admin path, also for paths with no controller.
 * It runs after the authorization filter, so only a logged-in user reaches it.
 */
public class MustChangePasswordFilter extends OncePerRequestFilter {

  static final String DETAIL = "Bạn cần đổi mật khẩu trước.";

  private final RequestMatcher adminArea =
      PathPatternRequestMatcher.withDefaults().matcher("/admin/**");
  private final LoginService loginService;

  public MustChangePasswordFilter(LoginService loginService) {
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
      try {
        if (loginService.requireActive(principal.userId()).isMustChangePassword()) {
          ProblemJsonWriter.write(response, HttpStatus.FORBIDDEN, DETAIL);
          return;
        }
      } catch (SessionExpiredException e) {
        // The user was deleted or disabled: end the session, as GET /auth/me does.
        HttpSession session = request.getSession(false);
        if (session != null) {
          session.invalidate();
        }
        SecurityContextHolder.clearContext();
        ProblemJsonWriter.write(response, e.getStatus(), e.getMessage());
        return;
      }
    }
    chain.doFilter(request, response);
  }
}
