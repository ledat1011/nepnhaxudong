package vn.nepnhaxudong.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

/**
 * Reads the CSRF token only from the request header ({@code X-XSRF-TOKEN}). The standard handler
 * also looks for a {@code _csrf} request parameter, and reading a parameter makes the servlet
 * container parse the body of the request (a multipart upload of up to 16 MB) before the user is
 * authenticated. The admin page sends the header, so the parameter is not needed.
 */
public class HeaderCsrfTokenRequestHandler extends CsrfTokenRequestAttributeHandler {

  @Override
  public String resolveCsrfTokenValue(HttpServletRequest request, CsrfToken csrfToken) {
    return request.getHeader(csrfToken.getHeaderName());
  }
}
