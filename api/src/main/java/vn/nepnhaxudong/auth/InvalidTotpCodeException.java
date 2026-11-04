package vn.nepnhaxudong.auth;

import org.springframework.http.HttpStatus;
import vn.nepnhaxudong.common.ApiException;

/** A wrong two-factor code at login (401, counted as a failed attempt). */
public class InvalidTotpCodeException extends ApiException {

  public InvalidTotpCodeException() {
    super(HttpStatus.UNAUTHORIZED, "Mã xác thực không đúng.");
  }
}
