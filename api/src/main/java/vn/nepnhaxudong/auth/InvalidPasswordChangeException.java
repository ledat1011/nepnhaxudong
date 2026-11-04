package vn.nepnhaxudong.auth;

import org.springframework.http.HttpStatus;
import vn.nepnhaxudong.common.ApiException;

public class InvalidPasswordChangeException extends ApiException {

  public InvalidPasswordChangeException(String detail) {
    super(HttpStatus.BAD_REQUEST, detail);
  }
}
