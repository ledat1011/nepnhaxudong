package vn.nepnhaxudong.auth;

import org.springframework.http.HttpStatus;
import vn.nepnhaxudong.common.ApiException;

/** The password was right but the user has two-factor login and sent no code. It is not a failed attempt. */
public class TotpRequiredException extends ApiException {

  public TotpRequiredException() {
    super(HttpStatus.UNAUTHORIZED, "Cần mã xác thực 2 lớp.");
  }
}
