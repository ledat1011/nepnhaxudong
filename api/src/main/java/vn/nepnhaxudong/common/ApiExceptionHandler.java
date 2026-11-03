package vn.nepnhaxudong.common;

import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Turns errors into {@code application/problem+json}. Spring's standard MVC errors are handled by the
 * parent class; validation and unreadable-body errors get a Vietnamese detail, and
 * {@link ApiException} carries its own status and detail.
 */
@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

  private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionHandler.class);

  @ExceptionHandler(ApiException.class)
  ResponseEntity<ProblemDetail> handleApi(ApiException e) {
    LOG.info("Request refused: {} {}", e.getStatus().value(), e.getMessage());
    return ResponseEntity.status(e.getStatus())
        .body(ProblemDetail.forStatusAndDetail(e.getStatus(), e.getMessage()));
  }

  /**
   * A multipart body that cannot be parsed: no boundary, or the body ends too early. (A body above
   * the size limit has its own handler below and answers 413.)
   */
  @ExceptionHandler(MultipartException.class)
  ResponseEntity<ProblemDetail> handleMultipart(MultipartException e) {
    LOG.warn("A multipart request could not be read: {}", e.toString());
    return ResponseEntity.badRequest()
        .body(
            ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "Nội dung gửi lên không đọc được."));
  }

  /**
   * Last resort for exceptions nobody expected: a generic 500 problem+json, and one WARN line with
   * the exception (never the request body, so no password is logged). Spring's own MVC exceptions
   * (400, 404, 405, ...) have more specific handlers in the parent class and win over this one.
   * Security exceptions and exceptions with {@code @ResponseStatus} are passed on, so Spring Security
   * and Spring can still answer them (401, 403, their own status).
   */
  @ExceptionHandler(Exception.class)
  ResponseEntity<ProblemDetail> handleUnexpected(Exception e) throws Exception {
    if (e instanceof AccessDeniedException
        || e instanceof AuthenticationException
        || AnnotatedElementUtils.hasAnnotation(e.getClass(), ResponseStatus.class)) {
      throw e;
    }
    LOG.warn("Unexpected error while handling a request", e);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(
            ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR, "Đã có lỗi xảy ra. Hãy thử lại sau."));
  }

  @Override
  protected ResponseEntity<Object> handleMethodArgumentNotValid(
      MethodArgumentNotValidException e,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    String detail =
        e.getBindingResult().getFieldErrors().stream()
            .map(FieldError::getDefaultMessage)
            .distinct()
            .collect(Collectors.joining(" "));
    if (detail.isBlank()) {
      detail = "Dữ liệu gửi lên không hợp lệ.";
    }
    return ResponseEntity.badRequest()
        .body(ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail));
  }

  /** An upload above the limit of {@code spring.servlet.multipart}: today only images are uploaded. */
  @Override
  protected ResponseEntity<Object> handleMaxUploadSizeExceededException(
      MaxUploadSizeExceededException e,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
        .body(
            ProblemDetail.forStatusAndDetail(
                HttpStatus.PAYLOAD_TOO_LARGE, "Ảnh quá lớn. Tối đa 15 MB."));
  }

  @Override
  protected ResponseEntity<Object> handleHttpMessageNotReadable(
      HttpMessageNotReadableException e,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    return ResponseEntity.badRequest()
        .body(
            ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "Nội dung gửi lên không đọc được."));
  }
}
