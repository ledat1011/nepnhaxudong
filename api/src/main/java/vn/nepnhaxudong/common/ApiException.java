package vn.nepnhaxudong.common;

import org.springframework.http.HttpStatus;

/** A business error that is answered as a problem+json response; the message is the Vietnamese detail. */
public class ApiException extends RuntimeException {

  private final HttpStatus status;

  public ApiException(HttpStatus status, String detail) {
    super(detail);
    this.status = status;
  }

  public HttpStatus getStatus() {
    return status;
  }
}
