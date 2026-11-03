package vn.nepnhaxudong.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.stereotype.Component;
import vn.nepnhaxudong.common.ProblemJsonWriter;

/** Answers security failures with problem+json (401 not logged in, 403 refused) instead of a redirect. */
@Component
public class ProblemSecurityHandlers implements AuthenticationEntryPoint, AccessDeniedHandler {

  @Override
  public void commence(
      HttpServletRequest request, HttpServletResponse response, AuthenticationException e)
      throws IOException {
    ProblemJsonWriter.write(response, HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập.");
  }

  @Override
  public void handle(
      HttpServletRequest request, HttpServletResponse response, AccessDeniedException e)
      throws IOException {
    String detail =
        e instanceof CsrfException
            ? "Mã bảo vệ CSRF thiếu hoặc không đúng. Hãy tải lại trang và thử lại."
            : "Bạn không có quyền thực hiện thao tác này.";
    ProblemJsonWriter.write(response, HttpStatus.FORBIDDEN, detail);
  }
}
