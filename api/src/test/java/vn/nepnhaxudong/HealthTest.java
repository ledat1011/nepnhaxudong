package vn.nepnhaxudong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(webEnvironment = RANDOM_PORT)
@AutoConfigureTestRestTemplate
@Import(TestcontainersConfig.class)
class HealthTest {

  @Autowired TestRestTemplate rest;

  @Test
  void healthIsUp() {
    // TestRestTemplate adds the context path (/api) by itself, so the real URL is /api/actuator/health.
    var r = rest.getForEntity("/actuator/health", String.class);
    assertThat(r.getStatusCode().value()).isEqualTo(200);
    assertThat(r.getBody()).contains("\"status\":\"UP\"");
  }
}
