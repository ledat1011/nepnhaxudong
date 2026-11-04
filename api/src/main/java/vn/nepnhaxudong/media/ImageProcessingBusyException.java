package vn.nepnhaxudong.media;

import org.springframework.http.HttpStatus;
import vn.nepnhaxudong.common.ApiException;

/** Two images are already being processed and none finished in time. Answered as 503. */
public class ImageProcessingBusyException extends ApiException {

  public ImageProcessingBusyException() {
    super(HttpStatus.SERVICE_UNAVAILABLE, "Máy chủ đang xử lý ảnh khác. Hãy thử lại sau.");
  }
}
