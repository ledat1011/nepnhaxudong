package vn.nepnhaxudong.common;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import tools.jackson.databind.json.JsonMapper;

/**
 * Writes a problem+json body from code that runs before Spring MVC (security filters, entry points),
 * where {@code ApiExceptionHandler} cannot be used. The shape matches Spring's {@code ProblemDetail}.
 */
public final class ProblemJsonWriter {

  private static final JsonMapper JSON = JsonMapper.builder().build();

  private ProblemJsonWriter() {}

  public static void write(HttpServletResponse response, HttpStatus status, String detail)
      throws IOException {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("type", "about:blank");
    body.put("title", status.getReasonPhrase());
    body.put("status", status.value());
    body.put("detail", detail);
    response.setStatus(status.value());
    response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
    response.setCharacterEncoding(StandardCharsets.UTF_8.name());
    response.getWriter().write(JSON.writeValueAsString(body));
  }
}
