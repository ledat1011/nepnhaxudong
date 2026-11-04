package vn.nepnhaxudong.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import vn.nepnhaxudong.auth.ApiClient;
import vn.nepnhaxudong.auth.AuthTestSupport;

/** Errors that Spring MVC raises itself must reach the admin with a Vietnamese detail. */
class SpringErrorsTest extends AuthTestSupport {

  @Test
  void anUnknownPathAnswers404InVietnamese() {
    var response = newClient().get("/public/test-probe/no-such-path");

    assertProblem(response, 404, "Không tìm thấy.");
  }

  @Test
  void aWrongMethodAnswers405InVietnamese() {
    var client = loggedInClient();

    assertProblem(client.post("/auth/csrf", null), 405, "Thao tác này không được hỗ trợ.");
  }

  @Test
  void aWrongContentTypeOnAJsonEndpointAnswers415InVietnamese() {
    var client = loggedInClient();

    var response =
        client.postRaw("/admin/products", "text/plain", "x".getBytes(StandardCharsets.UTF_8));

    assertProblem(response, 415, "Kiểu nội dung gửi lên không được hỗ trợ.");
  }

  @Test
  void aTypeMismatchAnswers400InVietnamese() {
    var client = loggedInClient();

    assertProblem(client.get("/admin/audit?page=x"), 400, "Dữ liệu gửi lên không hợp lệ.");
  }

  @Test
  void aMissingRequiredParameterAnswers400InVietnamese() {
    var response = newClient().get("/public/test-probe/needs-param");

    assertProblem(response, 400, "Dữ liệu gửi lên không hợp lệ.");
  }

  @Test
  void anAcceptHeaderThatCannotBeServedAnswers406InVietnamese() {
    var headers = new HttpHeaders();
    headers.setAccept(List.of(MediaType.IMAGE_PNG));

    var response =
        rest.exchange(
            "/public/vi/home", HttpMethod.GET, new HttpEntity<>(headers), String.class);

    assertProblem(response, 406, "Không trả được kiểu dữ liệu này.");
  }

  @Test
  void aStatusExceptionOfSpringKeepsItsStatusWithAVietnameseDetail() {
    var response = newClient().get("/public/test-probe/status");

    assertProblem(response, 418, "Yêu cầu không hợp lệ.");
  }

  @Test
  void theSpecificMessagesStayTheSame() {
    var client = newClient();
    client.fetchCsrf();

    var unreadable = client.post("/auth/login", "{not json");
    assertProblem(unreadable, 400, "Nội dung gửi lên không đọc được.");
  }

  private static void assertProblem(ResponseEntity<String> response, int status, String detail) {
    assertThat(response.getStatusCode().value()).isEqualTo(status);
    assertThat(response.getHeaders().getContentType().toString())
        .startsWith("application/problem+json");
    assertThat(ApiClient.json(response).path("detail").asString()).isEqualTo(detail);
  }
}
