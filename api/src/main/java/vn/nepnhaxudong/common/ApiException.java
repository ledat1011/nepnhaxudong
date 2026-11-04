package vn.nepnhaxudong.common;

import org.springframework.http.HttpStatus;

/** A business error that is answered as a problem+json response; the message is the Vietnamese detail. */
public class ApiException extends RuntimeException {

  private final HttpStatus status;
  private final String code;

  public ApiException(HttpStatus status, String detail) {
    this(status, detail, null);
  }

  /** {@code code} is a stable machine-readable name the admin web can switch on; null for none. */
  public ApiException(HttpStatus status, String detail, String code) {
    super(detail);
    this.status = status;
    this.code = code;
  }

  public HttpStatus getStatus() {
    return status;
  }

  public String getCode() {
    return code;
  }
}
