package vn.nepnhaxudong.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import vn.nepnhaxudong.common.ApiException;

/**
 * Roles "Chủ" (OWNER) and "Người nhà" (MEMBER). Only an owner manages accounts; the API refuses a
 * member with 403 on every account path. At least one enabled owner must always remain. An owner
 * can switch off the two-factor login of another person, who must then set it up again.
 */
class AccountRoleTest extends AuthTestSupport {

  private static final String OWNER_EMAIL = "owner@example.com";
  private static final String OWNER_PASSWORD = "owner-password-1";
  private static final String MEMBER_EMAIL = "member@example.com";
  private static final String MEMBER_PASSWORD = "member-password-1";
  private static final String TEMP_PASSWORD = "temporary-password-1";
  private static final String NEW_PASSWORD = "a-new-member-password";
  private static final String SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

  private static final String OWNER_ONLY = "Chỉ Chủ được quản lý tài khoản.";
  private static final String LAST_OWNER = "Cần ít nhất một Chủ đang hoạt động.";
  private static final String MUST_SETUP_TOTP = "Bạn cần bật lại xác thực 2 lớp trước.";

  @Autowired JdbcTemplate jdbc;
  @Autowired UserAdminService userAdminService;

  @BeforeEach
  void emptyLog() {
    jdbc.update("delete from audit_log");
  }

  // ---- a member cannot manage accounts ---------------------------------------------------------

  @Test
  void aMemberGetsForbiddenOnEveryAccountAction() {
    long ownerId = createOwner(OWNER_EMAIL, OWNER_PASSWORD, false).getId();
    var member = loggedInMember();

    List<ResponseEntity<String>> answers =
        List.of(
            member.get("/admin/users"),
            member.post(
                "/admin/users",
                Map.of("email", "x@example.com", "displayName", "X", "temporaryPassword", TEMP_PASSWORD)),
            member.post("/admin/users/" + ownerId + "/disable", null),
            member.post("/admin/users/" + ownerId + "/enable", null),
            member.post(
                "/admin/users/" + ownerId + "/reset-password", Map.of("temporaryPassword", TEMP_PASSWORD)),
            member.post("/admin/users/" + ownerId + "/role", Map.of("role", "MEMBER")),
            member.post("/admin/users/" + ownerId + "/disable-totp", null),
            // A path with no controller is refused too: the check runs before Spring MVC.
            member.get("/admin/users/" + ownerId + "/unknown"));

    for (var answer : answers) {
      assertThat(answer.getStatusCode().value()).isEqualTo(403);
      JsonNode body = ApiClient.json(answer);
      assertThat(body.path("detail").asString()).isEqualTo(OWNER_ONLY);
      assertThat(body.path("code").asString()).isEqualTo("owner-required");
    }
    var owner = users.findById(ownerId).orElseThrow();
    assertThat(owner.isEnabled()).isTrue();
    assertThat(owner.getRole()).isEqualTo(UserRole.OWNER);
    assertThat(users.count()).isEqualTo(2);
    assertThat(auditCount()).isZero();
  }

  @Test
  void aMemberStillEditsContentAndManagesTheirOwnTwoFactorLogin() {
    var member = loggedInMember();

    assertThat(member.get("/admin/products").getStatusCode().value()).isEqualTo(200);
    assertThat(member.get("/admin/audit").getStatusCode().value()).isEqualTo(200);
    assertThat(member.post("/admin/me/totp/setup", null).getStatusCode().value()).isEqualTo(200);
  }

  @Test
  void theServiceRefusesAMemberEvenWithoutTheWebFilter() {
    long memberId = createUser(MEMBER_EMAIL, MEMBER_PASSWORD, false).getId();
    long ownerId = createOwner(OWNER_EMAIL, OWNER_PASSWORD, false).getId();

    assertThatThrownBy(() -> userAdminService.disable(memberId, ownerId))
        .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getStatus().value()).isEqualTo(403));
    assertThatThrownBy(() -> userAdminService.changeRole(memberId, ownerId, UserRole.MEMBER, null))
        .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getStatus().value()).isEqualTo(403));
    assertThatThrownBy(() -> userAdminService.disableTotp(memberId, ownerId))
        .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getStatus().value()).isEqualTo(403));
    assertThatThrownBy(() -> userAdminService.resetPassword(memberId, ownerId, TEMP_PASSWORD))
        .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getStatus().value()).isEqualTo(403));
    assertThat(users.findById(ownerId).orElseThrow().isEnabled()).isTrue();
  }

  // ---- roles in the answers --------------------------------------------------------------------

  @Test
  void loginMeAndTheListShowTheRole() {
    createUser(MEMBER_EMAIL, MEMBER_PASSWORD, false);
    createOwner(OWNER_EMAIL, OWNER_PASSWORD, false);
    var owner = newClient();

    var login = login(owner, OWNER_EMAIL, OWNER_PASSWORD);
    assertThat(ApiClient.json(login).path("role").asString()).isEqualTo("OWNER");
    assertThat(ApiClient.json(login).path("mustSetupTotp").asBoolean()).isFalse();
    assertThat(ApiClient.json(owner.get("/auth/me")).path("role").asString()).isEqualTo("OWNER");

    JsonNode list = ApiClient.json(owner.get("/admin/users"));
    assertThat(list.get(0).path("role").asString()).isEqualTo("MEMBER");
    assertThat(list.get(1).path("role").asString()).isEqualTo("OWNER");
    assertThat(list.get(0).path("mustSetupTotp").asBoolean()).isFalse();

    var member = newClient();
    assertThat(ApiClient.json(login(member, MEMBER_EMAIL, MEMBER_PASSWORD)).path("role").asString())
        .isEqualTo("MEMBER");
  }

  @Test
  void aNewAccountIsAMember() {
    var owner = loggedInOwner();

    var created =
        owner.post(
            "/admin/users",
            Map.of("email", "new@example.com", "displayName", "Bác Hai", "temporaryPassword", TEMP_PASSWORD));

    assertThat(created.getStatusCode().value()).isEqualTo(201);
    assertThat(ApiClient.json(created).path("role").asString()).isEqualTo("MEMBER");
    assertThat(users.findByEmail("new@example.com").orElseThrow().getRole()).isEqualTo(UserRole.MEMBER);
  }

  // ---- changing the role -----------------------------------------------------------------------

  @Test
  void anOwnerPromotesAMemberWhoCanThenManageAccounts() {
    var owner = loggedInOwner();
    long memberId = createUser(MEMBER_EMAIL, MEMBER_PASSWORD, false).getId();
    var member = newClient();
    login(member, MEMBER_EMAIL, MEMBER_PASSWORD);
    member.fetchCsrf();
    assertThat(member.get("/admin/users").getStatusCode().value()).isEqualTo(403);

    var promoted = owner.post("/admin/users/" + memberId + "/role", Map.of("role", "OWNER"));

    assertThat(promoted.getStatusCode().value()).isEqualTo(204);
    assertThat(users.findById(memberId).orElseThrow().getRole()).isEqualTo(UserRole.OWNER);
    // The role is read from the database on each request, so the open session gets the new right.
    assertThat(member.get("/admin/users").getStatusCode().value()).isEqualTo(200);
    var line = onlyAuditLine();
    assertThat(line.get("action")).isEqualTo("UPDATE");
    assertThat(json(line.get("before_json")).path("role").asString()).isEqualTo("MEMBER");
    assertThat(json(line.get("after_json")).path("role").asString()).isEqualTo("OWNER");
  }

  @Test
  void demotingAnOwnerEndsAllTheirSessions() {
    var first = loggedInOwner();
    long secondId = createOwner("second@example.com", "second-password-1", false).getId();
    var second = newClient();
    login(second, "second@example.com", "second-password-1");
    assertThat(second.get("/auth/me").getStatusCode().value()).isEqualTo(200);

    var demoted = first.post("/admin/users/" + secondId + "/role", Map.of("role", "MEMBER"));

    assertThat(demoted.getStatusCode().value()).isEqualTo(204);
    assertThat(users.findById(secondId).orElseThrow().getRole()).isEqualTo(UserRole.MEMBER);
    assertThat(second.get("/auth/me").getStatusCode().value()).isEqualTo(401);
    assertThat(first.get("/auth/me").getStatusCode().value()).isEqualTo(200);
  }

  @Test
  void theOnlyOwnerCannotDemoteThemself() {
    var owner = loggedInOwner();
    long ownerId = users.findByEmail(OWNER_EMAIL).orElseThrow().getId();
    createUser(MEMBER_EMAIL, MEMBER_PASSWORD, false);

    var refused = owner.post("/admin/users/" + ownerId + "/role", Map.of("role", "MEMBER"));

    assertThat(refused.getStatusCode().value()).isEqualTo(409);
    assertThat(ApiClient.json(refused).path("detail").asString()).isEqualTo(LAST_OWNER);
    assertThat(users.findById(ownerId).orElseThrow().getRole()).isEqualTo(UserRole.OWNER);
    assertThat(auditCount()).isZero();
  }

  @Test
  void aLockedOwnerDoesNotCountAsTheOwnerThatRemains() {
    var owner = loggedInOwner();
    long ownerId = users.findByEmail(OWNER_EMAIL).orElseThrow().getId();
    var locked = createOwner("locked@example.com", "locked-password-1", false);
    locked.setEnabled(false);
    users.save(locked);

    var refused = owner.post("/admin/users/" + ownerId + "/role", Map.of("role", "MEMBER"));

    assertThat(refused.getStatusCode().value()).isEqualTo(409);
    assertThat(ApiClient.json(refused).path("detail").asString()).isEqualTo(LAST_OWNER);
  }

  @Test
  void anOwnerMayStepDownWhenAnotherOwnerRemainsAndKeepsTheCurrentSession() {
    var owner = loggedInOwner();
    long ownerId = users.findByEmail(OWNER_EMAIL).orElseThrow().getId();
    createOwner("second@example.com", "second-password-1", false);

    var stepDown = owner.post("/admin/users/" + ownerId + "/role", Map.of("role", "MEMBER"));

    assertThat(stepDown.getStatusCode().value()).isEqualTo(204);
    assertThat(users.findById(ownerId).orElseThrow().getRole()).isEqualTo(UserRole.MEMBER);
    assertThat(owner.get("/auth/me").getStatusCode().value()).isEqualTo(200);
    assertThat(owner.get("/admin/users").getStatusCode().value()).isEqualTo(403);
  }

  @Test
  void aWrongRoleIsRefused() {
    var owner = loggedInOwner();
    long memberId = createUser(MEMBER_EMAIL, MEMBER_PASSWORD, false).getId();

    assertThat(owner.post("/admin/users/" + memberId + "/role", Map.of("role", "ADMIN")).getStatusCode().value())
        .isEqualTo(400);
    assertThat(owner.post("/admin/users/" + memberId + "/role", Map.of()).getStatusCode().value())
        .isEqualTo(400);
    assertThat(owner.post("/admin/users/999999/role", Map.of("role", "OWNER")).getStatusCode().value())
        .isEqualTo(404);
    assertThat(users.findById(memberId).orElseThrow().getRole()).isEqualTo(UserRole.MEMBER);
  }

  @Test
  void twoOwnersWhoDemoteEachOtherAtTheSameTimeLeaveOneOwner() throws Exception {
    long a = createOwner("a@example.com", "a-password-long-1", false).getId();
    long b = createOwner("b@example.com", "b-password-long-1", false).getId();
    var start = new CountDownLatch(1);
    ExecutorService pool = Executors.newFixedThreadPool(2);
    try {
      List<Future<Boolean>> results = new ArrayList<>();
      for (long[] pair : new long[][] {{a, b}, {b, a}}) {
        results.add(
            pool.submit(
                () -> {
                  start.await();
                  try {
                    userAdminService.changeRole(pair[0], pair[1], UserRole.MEMBER, null);
                    return true;
                  } catch (ApiException e) {
                    return false;
                  }
                }));
      }
      start.countDown();
      int succeeded = 0;
      for (var result : results) {
        if (result.get(30, TimeUnit.SECONDS)) {
          succeeded++;
        }
      }
      assertThat(succeeded).isEqualTo(1);
    } finally {
      pool.shutdownNow();
    }
    long owners =
        users.findAll().stream().filter(u -> u.getRole() == UserRole.OWNER && u.isEnabled()).count();
    assertThat(owners).isEqualTo(1);
  }

  // ---- an owner switches off the two-factor login of another person -----------------------------

  @Test
  void anOwnerSwitchesOffTheTwoFactorLoginOfAMemberWhoMustSetItUpAgain() {
    var owner = loggedInOwner();
    long ownerId = users.findByEmail(OWNER_EMAIL).orElseThrow().getId();
    long memberId = createTotpMember().getId();
    var oldSession = newClient();
    assertThat(loginWithCode(oldSession, MEMBER_EMAIL, MEMBER_PASSWORD, code()).getStatusCode().value())
        .isEqualTo(200);

    var off = owner.post("/admin/users/" + memberId + "/disable-totp", null);

    assertThat(off.getStatusCode().value()).isEqualTo(204);
    var member = users.findById(memberId).orElseThrow();
    assertThat(member.isTotpEnabled()).isFalse();
    assertThat(member.getTotpSecret()).isNull();
    assertThat(member.isMustSetupTotp()).isTrue();
    // The lost phone may still hold an open session: it ends.
    assertThat(oldSession.get("/auth/me").getStatusCode().value()).isEqualTo(401);
    // The action is in the history, without secrets.
    var line = onlyAuditLine();
    assertThat(line.get("user_id")).isEqualTo(ownerId);
    assertThat(line.get("entity_id")).isEqualTo(memberId);
    assertThat(json(line.get("before_json")).path("totpEnabled").asBoolean()).isTrue();
    assertThat(json(line.get("after_json")).path("totpEnabled").asBoolean()).isFalse();
    assertThat(json(line.get("after_json")).path("mustSetupTotp").asBoolean()).isTrue();
    assertThat(String.valueOf(line.get("after_json"))).doesNotContain(SECRET);

    // The next sign-in needs no code, and only the two-factor setup is open until it is done.
    var client = newClient();
    var login = login(client, MEMBER_EMAIL, MEMBER_PASSWORD);
    assertThat(login.getStatusCode().value()).isEqualTo(200);
    assertThat(ApiClient.json(login).path("mustSetupTotp").asBoolean()).isTrue();
    client.fetchCsrf();
    var blocked = client.get("/admin/products");
    assertThat(blocked.getStatusCode().value()).isEqualTo(403);
    assertThat(ApiClient.json(blocked).path("code").asString()).isEqualTo("must-setup-totp");
    assertThat(ApiClient.json(blocked).path("detail").asString()).isEqualTo(MUST_SETUP_TOTP);

    String secret = ApiClient.json(client.post("/admin/me/totp/setup", null)).path("secret").asString();
    var enabled = client.post("/admin/me/totp/enable", Map.of("code", Totp.code(secret, now())));
    assertThat(enabled.getStatusCode().value()).isEqualTo(204);

    assertThat(client.get("/admin/products").getStatusCode().value()).isEqualTo(200);
    assertThat(ApiClient.json(client.get("/auth/me")).path("mustSetupTotp").asBoolean()).isFalse();
    assertThat(users.findById(memberId).orElseThrow().isMustSetupTotp()).isFalse();
  }

  @Test
  void switchingOffTwoFactorLoginIsRefusedForYourselfAndWhenItIsOff() {
    var owner = loggedInOwner();
    long ownerId = users.findByEmail(OWNER_EMAIL).orElseThrow().getId();
    long plainId = createUser(MEMBER_EMAIL, MEMBER_PASSWORD, false).getId();

    var self = owner.post("/admin/users/" + ownerId + "/disable-totp", null);
    assertThat(self.getStatusCode().value()).isEqualTo(409);
    assertThat(ApiClient.json(self).path("detail").asString())
        .isEqualTo("Hãy tắt xác thực 2 lớp của chính bạn bằng mã 6 số.");

    var notOn = owner.post("/admin/users/" + plainId + "/disable-totp", null);
    assertThat(notOn.getStatusCode().value()).isEqualTo(409);
    assertThat(ApiClient.json(notOn).path("detail").asString()).isEqualTo("Xác thực 2 lớp chưa được bật.");

    assertThat(owner.post("/admin/users/999999/disable-totp", null).getStatusCode().value()).isEqualTo(404);
    assertThat(users.findById(plainId).orElseThrow().isMustSetupTotp()).isFalse();
    assertThat(auditCount()).isZero();
  }

  @Test
  void resettingThePasswordOfATwoFactorUserAlsoAsksForANewSetupAfterThePasswordChange() {
    var owner = loggedInOwner();
    long memberId = createTotpMember().getId();
    long plainId = createUser("plain@example.com", "plain-password-1", false).getId();

    owner.post("/admin/users/" + memberId + "/reset-password", Map.of("temporaryPassword", TEMP_PASSWORD));
    owner.post("/admin/users/" + plainId + "/reset-password", Map.of("temporaryPassword", TEMP_PASSWORD));

    var member = users.findById(memberId).orElseThrow();
    assertThat(member.isTotpEnabled()).isFalse();
    assertThat(member.isMustSetupTotp()).isTrue();
    // Someone who never had two-factor login is not asked to set it up.
    assertThat(users.findById(plainId).orElseThrow().isMustSetupTotp()).isFalse();

    // First the password, then the two-factor setup.
    var client = newClient();
    login(client, MEMBER_EMAIL, TEMP_PASSWORD);
    client.fetchCsrf();
    assertThat(ApiClient.json(client.post("/admin/me/totp/setup", null)).path("code").asString())
        .isEqualTo("must-change-password");
    var change =
        client.post("/auth/password", Map.of("currentPassword", TEMP_PASSWORD, "newPassword", NEW_PASSWORD));
    assertThat(change.getStatusCode().value()).isEqualTo(204);
    assertThat(ApiClient.json(client.get("/admin/products")).path("code").asString())
        .isEqualTo("must-setup-totp");
    assertThat(client.post("/admin/me/totp/setup", null).getStatusCode().value()).isEqualTo(200);
  }

  @Test
  void aUserWhoMustSetUpTwoFactorLoginCannotSwitchItOffOrManageAccounts() {
    var owner = createOwner(OWNER_EMAIL, OWNER_PASSWORD, false);
    owner.setMustSetupTotp(true);
    users.save(owner);
    var client = newClient();
    login(client, OWNER_EMAIL, OWNER_PASSWORD);
    client.fetchCsrf();

    assertThat(ApiClient.json(client.get("/admin/users")).path("code").asString()).isEqualTo("must-setup-totp");
    assertThat(ApiClient.json(client.post("/admin/me/totp/disable", Map.of("code", "123456"))).path("code").asString())
        .isEqualTo("must-setup-totp");
    // Signing out and reading the own account stay open.
    assertThat(client.get("/auth/me").getStatusCode().value()).isEqualTo(200);
  }

  // ---- helpers -------------------------------------------------------------------------------

  private ApiClient loggedInOwner() {
    createOwner(OWNER_EMAIL, OWNER_PASSWORD, false);
    var client = newClient();
    assertThat(login(client, OWNER_EMAIL, OWNER_PASSWORD).getStatusCode().value()).isEqualTo(200);
    client.fetchCsrf();
    return client;
  }

  private ApiClient loggedInMember() {
    createUser(MEMBER_EMAIL, MEMBER_PASSWORD, false);
    var client = newClient();
    assertThat(login(client, MEMBER_EMAIL, MEMBER_PASSWORD).getStatusCode().value()).isEqualTo(200);
    client.fetchCsrf();
    return client;
  }

  private AppUser createTotpMember() {
    var user = createUser(MEMBER_EMAIL, MEMBER_PASSWORD, false);
    user.setTotpSecret(SECRET);
    user.setTotpEnabled(true);
    return users.save(user);
  }

  private ResponseEntity<String> loginWithCode(ApiClient client, String email, String password, String code) {
    return client.post("/auth/login", Map.of("email", email, "password", password, "totpCode", code));
  }

  private long now() {
    return clock.instant().getEpochSecond();
  }

  private String code() {
    return Totp.code(SECRET, now());
  }

  private int auditCount() {
    Integer count = jdbc.queryForObject("select count(*) from audit_log", Integer.class);
    return count == null ? 0 : count;
  }

  private Map<String, Object> onlyAuditLine() {
    var lines =
        jdbc.queryForList(
            "select user_id, entity_id, action, before_json::text as before_json,"
                + " after_json::text as after_json from audit_log where entity_type = 'app_user'");
    assertThat(lines).hasSize(1);
    return lines.get(0);
  }

  private static JsonNode json(Object text) {
    return JsonMapper.builder().build().readTree(String.valueOf(text));
  }
}
