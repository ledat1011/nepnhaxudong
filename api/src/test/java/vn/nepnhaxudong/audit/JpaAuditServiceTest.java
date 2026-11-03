package vn.nepnhaxudong.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.support.TransactionTemplate;
import vn.nepnhaxudong.TestcontainersConfig;

@ExtendWith(OutputCaptureExtension.class)
@SpringBootTest
@Import(TestcontainersConfig.class)
class JpaAuditServiceTest {

  @Autowired AuditService audit;
  @Autowired JdbcTemplate jdbc;
  @Autowired TransactionTemplate transaction;

  @BeforeEach
  void emptyLog() {
    jdbc.update("delete from audit_log");
  }

  @Test
  void itRefusesToRunWithoutATransactionOfTheCaller() {
    assertThatThrownBy(
            () -> audit.record("timeline_event", 1, AuditAction.CREATE, null, Map.of("id", 1)))
        .isInstanceOf(IllegalTransactionStateException.class);
    assertThat(jdbc.queryForObject("select count(*) from audit_log", Integer.class)).isZero();
  }

  @Test
  void aCallWithoutALoggedInUserHasNoUserId() {
    transaction.executeWithoutResult(
        status ->
            audit.record(
                "timeline_event", 7, AuditAction.UPDATE, Map.of("year", 1), Map.of("year", 2)));

    var row = jdbc.queryForMap("select * from audit_log");
    assertThat(row.get("user_id")).isNull();
    assertThat(row.get("entity_type")).isEqualTo("timeline_event");
    assertThat(row.get("entity_id")).isEqualTo(7L);
    assertThat(row.get("action")).isEqualTo("UPDATE");
    assertThat(
            jdbc.queryForObject(
                "select before_json ->> 'year' from audit_log", String.class))
        .isEqualTo("1");
    assertThat(
            jdbc.queryForObject("select after_json ->> 'year' from audit_log", String.class))
        .isEqualTo("2");
  }

  @Test
  void aPrincipalNameThatIsNotANumberGivesNoUserAndAWarningWithoutTheName(
      CapturedOutput output) {
    var authentication =
        UsernamePasswordAuthenticationToken.authenticated("secret-name-xyz", "n/a", List.of());
    SecurityContextHolder.getContext().setAuthentication(authentication);
    try {
      transaction.executeWithoutResult(
          status -> audit.record("timeline_event", 3, AuditAction.CREATE, null, Map.of("id", 3)));
    } finally {
      SecurityContextHolder.clearContext();
    }

    assertThat(jdbc.queryForObject("select user_id from audit_log", Long.class)).isNull();
    assertThat(output.getAll()).contains("WARN").contains("not a user id");
    assertThat(output.getAll()).doesNotContain("secret-name-xyz");
  }

  @Test
  void theLineIsRolledBackWithTheTransactionOfTheCaller() {
    assertThatThrownBy(
            () ->
                transaction.executeWithoutResult(
                    status -> {
                      audit.record("timeline_event", 1, AuditAction.CREATE, null, Map.of());
                      throw new IllegalStateException("the change failed");
                    }))
        .isInstanceOf(IllegalStateException.class);

    assertThat(jdbc.queryForObject("select count(*) from audit_log", Integer.class)).isZero();
  }
}
