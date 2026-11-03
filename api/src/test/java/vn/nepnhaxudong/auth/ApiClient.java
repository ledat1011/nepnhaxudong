package vn.nepnhaxudong.auth;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** One simulated browser: it keeps cookies between calls, like a real client does. */
public final class ApiClient {

  private static final JsonMapper JSON = JsonMapper.builder().build();

  private final TestRestTemplate rest;
  private final Map<String, String> cookies = new LinkedHashMap<>();
  private String csrfToken;

  public ApiClient(TestRestTemplate rest) {
    this.rest = rest;
  }

  /** Calls GET /auth/csrf and remembers the token; later write calls send it as X-XSRF-TOKEN. */
  public JsonNode fetchCsrf() {
    var response = get("/auth/csrf");
    JsonNode body = json(response);
    csrfToken = body.path("token").asString();
    return body;
  }

  public void useCsrfToken(String token) {
    csrfToken = token;
  }

  public void useCookie(String name, String value) {
    cookies.put(name, value);
  }

  public String cookie(String name) {
    return cookies.get(name);
  }

  public ResponseEntity<String> get(String path) {
    return send(HttpMethod.GET, path, null);
  }

  public ResponseEntity<String> post(String path, Object body) {
    return send(HttpMethod.POST, path, body);
  }

  public ResponseEntity<String> put(String path, Object body) {
    return send(HttpMethod.PUT, path, body);
  }

  public ResponseEntity<String> delete(String path) {
    return send(HttpMethod.DELETE, path, null);
  }

  public static JsonNode json(ResponseEntity<String> response) {
    return JSON.readTree(response.getBody());
  }

  private ResponseEntity<String> send(HttpMethod method, String path, Object body) {
    var headers = new HttpHeaders();
    headers.setContentType(
        body instanceof MultiValueMap ? MediaType.MULTIPART_FORM_DATA : MediaType.APPLICATION_JSON);
    if (!cookies.isEmpty()) {
      headers.set(
          HttpHeaders.COOKIE,
          cookies.entrySet().stream()
              .map(e -> e.getKey() + "=" + e.getValue())
              .collect(Collectors.joining("; ")));
    }
    if (method != HttpMethod.GET && csrfToken != null) {
      headers.set("X-XSRF-TOKEN", csrfToken);
    }
    var response = rest.exchange(path, method, new HttpEntity<>(body, headers), String.class);
    remember(response.getHeaders().get(HttpHeaders.SET_COOKIE));
    return response;
  }

  private void remember(List<String> setCookies) {
    if (setCookies == null) {
      return;
    }
    for (String line : setCookies) {
      String pair = line.split(";", 2)[0];
      int eq = pair.indexOf('=');
      String name = pair.substring(0, eq);
      String value = pair.substring(eq + 1);
      boolean expired = line.toLowerCase().contains("max-age=0") || value.isEmpty();
      if (expired) {
        cookies.remove(name);
      } else {
        cookies.put(name, value);
      }
    }
  }
}
