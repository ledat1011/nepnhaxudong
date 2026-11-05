package vn.nepnhaxudong.auth;

import org.springframework.http.HttpStatus;
import vn.nepnhaxudong.common.ApiException;

/** Unknown email, wrong password and disabled user all give this same answer (no account enumeration). */
public class InvalidCredentialsException extends ApiException {

  public InvalidCredentialsException() {
    super(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không đúng.", ProblemCodes.INVALID_CREDENTIALS);
  }
}
