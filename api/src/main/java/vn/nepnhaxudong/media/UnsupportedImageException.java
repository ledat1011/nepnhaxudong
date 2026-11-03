package vn.nepnhaxudong.media;

import org.springframework.http.HttpStatus;
import vn.nepnhaxudong.common.ApiException;

/** The uploaded file is not an image the site accepts. Answered as 415 with a Vietnamese detail. */
public class UnsupportedImageException extends ApiException {

  public UnsupportedImageException(String detail) {
    super(HttpStatus.UNSUPPORTED_MEDIA_TYPE, detail);
  }
}
