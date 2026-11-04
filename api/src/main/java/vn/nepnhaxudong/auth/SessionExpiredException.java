package vn.nepnhaxudong.auth;

import org.springframework.http.HttpStatus;
import vn.nepnhaxudong.common.ApiException;

/** The session points to a user that no longer exists or is disabled. */
public class SessionExpiredException extends ApiException {

  public SessionExpiredException() {
    super(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không còn hiệu lực. Hãy đăng nhập lại.", ProblemCodes.SESSION_EXPIRED);
  }
}
