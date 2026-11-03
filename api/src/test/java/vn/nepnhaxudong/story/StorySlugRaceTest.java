package vn.nepnhaxudong.story;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;

import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import vn.nepnhaxudong.auth.ApiClient;
import vn.nepnhaxudong.auth.AuthTestSupport;

/**
 * Two admins can save the same slug at the same time: both checks pass, and the unique index of
 * the database refuses the second write. The check is switched off here to reach that index.
 */
class StorySlugRaceTest extends AuthTestSupport {

  @Autowired JdbcTemplate jdbc;
  @MockitoSpyBean StoryRepository stories;

  @BeforeEach
  @AfterEach
  void emptyTables() {
    jdbc.update("delete from audit_log");
    jdbc.update("delete from story");
  }

  @Test
  void aDuplicateSlugThatPassesTheCheckIsStillAnswered409AndRolledBack() {
    var client = loggedInClient();
    assertThat(client.post("/admin/stories", story("Một")).getStatusCode().value()).isEqualTo(201);
    doReturn(false).when(stories).slugTakenByOther(anyString(), anyString(), anyLong());

    var second = client.post("/admin/stories", story("Một"));

    assertThat(second.getStatusCode().value()).isEqualTo(409);
    assertThat(ApiClient.json(second).path("detail").asString())
        .isEqualTo("Đường dẫn bài viết đã tồn tại.");
    assertThat(jdbc.queryForObject("select count(*) from story", Integer.class)).isEqualTo(1);
    assertThat(jdbc.queryForObject("select count(*) from audit_log", Integer.class)).isEqualTo(1);
  }

  private static Map<String, Object> story(String titleVi) {
    var title = new LinkedHashMap<String, Object>();
    title.put("vi", titleVi);
    var body = new LinkedHashMap<String, Object>();
    body.put("title", title);
    return body;
  }
}
