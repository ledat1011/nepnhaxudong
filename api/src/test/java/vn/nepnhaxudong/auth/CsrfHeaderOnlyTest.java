package vn.nepnhaxudong.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

/** The CSRF token is read from the X-XSRF-TOKEN header only, never from a request parameter. */
class CsrfHeaderOnlyTest extends AuthTestSupport {

  private static final String BOUNDARY = "testboundary";

  @Test
  void aMultipartUploadWithoutTheHeaderIsRefusedWith403() {
    var client = loggedInClientWithoutHeader();

    var response = client.postRaw("/admin/media", multipartType(), multipart("_csrf", token(client)));

    assertThat(response.getStatusCode().value()).isEqualTo(403);
  }

  @Test
  void aFormFieldNamedCsrfIsNotAccepted() {
    var client = loggedInClientWithoutHeader();

    var response =
        client.postRaw(
            "/auth/logout",
            "application/x-www-form-urlencoded",
            ("_csrf=" + token(client)).getBytes(StandardCharsets.UTF_8));

    assertThat(response.getStatusCode().value()).isEqualTo(403);
  }

  @Test
  void aQueryParameterNamedCsrfIsNotAccepted() {
    var client = loggedInClientWithoutHeader();

    var response = client.postRaw("/auth/logout?_csrf=" + token(client), "text/plain", new byte[0]);

    assertThat(response.getStatusCode().value()).isEqualTo(403);
  }

  @Test
  void theHeaderStillWorks() {
    var client = loggedInClient();

    assertThat(client.post("/auth/logout", null).getStatusCode().value()).isEqualTo(204);
  }

  /** Logged in, holds the XSRF-TOKEN cookie, but does not send the header. */
  private ApiClient loggedInClientWithoutHeader() {
    createUser("owner@example.com", "correct-password-1", false);
    var client = newClient();
    assertThat(login(client, "owner@example.com", "correct-password-1").getStatusCode().value())
        .isEqualTo(200);
    assertThat(token(client)).isNotBlank();
    return client;
  }

  private static String token(ApiClient client) {
    return client.cookie("XSRF-TOKEN");
  }

  private static String multipartType() {
    return "multipart/form-data; boundary=" + BOUNDARY;
  }

  private static byte[] multipart(String field, String value) {
    String body =
        "--%s\r\nContent-Disposition: form-data; name=\"%s\"\r\n\r\n%s\r\n--%s--\r\n"
            .formatted(BOUNDARY, field, value, BOUNDARY);
    return body.getBytes(StandardCharsets.UTF_8);
  }
}
