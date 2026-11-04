package vn.nepnhaxudong.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doReturn;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import vn.nepnhaxudong.auth.ApiClient;
import vn.nepnhaxudong.auth.AuthTestSupport;

/**
 * A reference that is added between the "is it used" check and the delete: the check says no, the
 * database constraint ({@code on delete restrict}) still refuses, and the answer is the same 409.
 */
class MediaDeleteRaceTest extends AuthTestSupport {

  @Autowired JdbcTemplate jdbc;
  @MockitoSpyBean MediaRepository mediaRepository;

  @BeforeEach
  void emptyTables() {
    jdbc.update("delete from audit_log");
    jdbc.update("delete from story");
    jdbc.update("delete from media");
  }

  @Test
  void theDatabaseConstraintGivesTheSame409WhenTheCheckMissedAReference() {
    var client = loggedInClient();
    long id =
        mediaRepository
            .save(Media.create("2031/01/race.jpg", "image/jpeg", 10, 10, 100L, "Ảnh", "Image"))
            .getId();
    jdbc.update("insert into story (cover_media_id) values (?)", id);
    doReturn(false).when(mediaRepository).isUsed(id);

    var response = client.delete("/admin/media/" + id);

    assertThat(response.getStatusCode().value()).isEqualTo(409);
    assertThat(ApiClient.json(response).path("detail").asString())
        .isEqualTo("Ảnh đang được dùng.");
    assertThat(jdbc.queryForObject("select count(*) from media", Integer.class)).isEqualTo(1);
    assertThat(
            jdbc.queryForObject(
                "select count(*) from audit_log where entity_type = 'media'", Integer.class))
        .isZero();
  }
}
