package vn.nepnhaxudong.press;

/** A press preview could not be made. The message is for the log; the admin only sees empty fields. */
public class PreviewFailedException extends Exception {

  public PreviewFailedException(String message) {
    super(message);
  }

  public PreviewFailedException(String message, Throwable cause) {
    super(message, cause);
  }
}
