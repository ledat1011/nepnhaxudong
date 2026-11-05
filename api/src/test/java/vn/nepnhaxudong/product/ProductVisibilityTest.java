package vn.nepnhaxudong.product;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import vn.nepnhaxudong.auth.ApiClient;
import vn.nepnhaxudong.auth.AuthTestSupport;

/**
 * The "Hiện trên web" switch of a product: a new product is hidden, show and hide change only the
 * switch, and the public home page lists only the products that are shown.
 */
class ProductVisibilityTest extends AuthTestSupport {

  private static final String NOT_FOUND = "Không tìm thấy sản phẩm.";

  @Autowired JdbcTemplate jdbc;

  @BeforeEach
  void emptyTables() {
    jdbc.update("delete from audit_log");
    jdbc.update("delete from product");
  }

  // ---- defaults ------------------------------------------------------------------------------

  @Test
  void aNewProductIsHidden() {
    var client = loggedInClient();

    var created = client.post("/admin/products", body("Nếp mới"));

    assertThat(created.getStatusCode().value()).isEqualTo(201);
    long id = ApiClient.json(created).path("id").asLong();
    assertThat(ApiClient.json(created).path("visible").asBoolean()).isFalse();
    assertThat(ApiClient.json(client.get("/admin/products/" + id)).path("visible").isBoolean())
        .isTrue();
    assertThat(stored(id)).isFalse();
  }

  @Test
  void aRowInsertedWithoutTheColumnIsHidden() {
    Long id =
        jdbc.queryForObject("insert into product (sort_order) values (0) returning id", Long.class);

    assertThat(stored(id)).isFalse();
  }

  // ---- show and hide -------------------------------------------------------------------------

  @Test
  void showPutsTheProductOnTheHomePageAndHideTakesItOff() {
    var client = loggedInClient();
    long id = create(client, "Nếp cái hoa vàng");
    assertThat(publicNames()).isEmpty();

    var shown = client.post("/admin/products/" + id + "/show", Map.of());

    assertThat(shown.getStatusCode().value()).isEqualTo(200);
    assertThat(ApiClient.json(shown).path("visible").asBoolean()).isTrue();
    assertThat(ApiClient.json(shown).path("name").path("vi").asString())
        .isEqualTo("Nếp cái hoa vàng");
    assertThat(stored(id)).isTrue();
    assertThat(publicNames()).containsExactly("Nếp cái hoa vàng");

    var hidden = client.post("/admin/products/" + id + "/hide", Map.of());

    assertThat(hidden.getStatusCode().value()).isEqualTo(200);
    assertThat(ApiClient.json(hidden).path("visible").asBoolean()).isFalse();
    assertThat(stored(id)).isFalse();
    assertThat(publicNames()).isEmpty();
  }

  @Test
  void theHomePageListsOnlyTheShownProductsInTheirOrder() {
    var client = loggedInClient();
    long hidden = create(client, "Ẩn");
    long second = create(client, "Hai");
    long first = create(client, "Một");
    client.post("/admin/products/" + second + "/show", Map.of());
    client.post("/admin/products/" + first + "/show", Map.of());
    jdbc.update("update product set sort_order = 1 where id = ?", second);

    assertThat(publicNames()).containsExactly("Một", "Hai");
    assertThat(publicNames("en")).hasSize(2);
    assertThat(hidden).isPositive();
  }

  @Test
  void theAdminListStillShowsHiddenProducts() {
    var client = loggedInClient();
    long hidden = create(client, "Ẩn");
    long shown = create(client, "Hiện");
    client.post("/admin/products/" + shown + "/show", Map.of());

    JsonNode list = ApiClient.json(client.get("/admin/products"));

    assertThat(list).hasSize(2);
    assertThat(list.get(0).path("id").asLong()).isEqualTo(hidden);
    assertThat(list.get(0).path("visible").asBoolean()).isFalse();
    assertThat(list.get(1).path("visible").asBoolean()).isTrue();
  }

  @Test
  void saveKeepsTheSwitchAsItIs() {
    var client = loggedInClient();
    long id = create(client, "Tên cũ");
    client.post("/admin/products/" + id + "/show", Map.of());
    var changed = body("Tên mới");
    changed.put("visible", false);

    var response = client.put("/admin/products/" + id, changed);

    assertThat(response.getStatusCode().value()).isEqualTo(200);
    assertThat(ApiClient.json(response).path("visible").asBoolean()).isTrue();
    assertThat(stored(id)).isTrue();
  }

  @Test
  void aVisibleFieldInTheCreateBodyIsIgnored() {
    var client = loggedInClient();
    var body = body("Gửi kèm visible");
    body.put("visible", true);

    long id = ApiClient.json(client.post("/admin/products", body)).path("id").asLong();

    assertThat(stored(id)).isFalse();
  }

  // ---- audit ---------------------------------------------------------------------------------

  @Test
  void showAndHideAreRecordedAsUpdatesWithTheSwitchBeforeAndAfter() {
    var client = loggedInClient();
    long id = create(client, "Nếp");

    client.post("/admin/products/" + id + "/show", Map.of());
    client.post("/admin/products/" + id + "/hide", Map.of());

    List<Map<String, Object>> rows =
        jdbc.queryForList(
            "select before_json ->> 'visible' as before_visible,"
                + " after_json ->> 'visible' as after_visible"
                + " from audit_log where entity_type = 'product' and entity_id = ?"
                + " and action = 'UPDATE' order by id",
            id);
    assertThat(rows).hasSize(2);
    assertThat(rows.get(0)).containsEntry("before_visible", "false");
    assertThat(rows.get(0)).containsEntry("after_visible", "true");
    assertThat(rows.get(1)).containsEntry("before_visible", "true");
    assertThat(rows.get(1)).containsEntry("after_visible", "false");
  }

  @Test
  void showingAShownProductOrHidingAHiddenOneChangesNothingAndWritesNoAuditLine() {
    var client = loggedInClient();
    long id = create(client, "Nếp");
    int linesAfterCreate = auditLines(id);

    var hideHidden = client.post("/admin/products/" + id + "/hide", Map.of());
    client.post("/admin/products/" + id + "/show", Map.of());
    var showShown = client.post("/admin/products/" + id + "/show", Map.of());

    assertThat(hideHidden.getStatusCode().value()).isEqualTo(200);
    assertThat(ApiClient.json(hideHidden).path("visible").asBoolean()).isFalse();
    assertThat(showShown.getStatusCode().value()).isEqualTo(200);
    assertThat(ApiClient.json(showShown).path("visible").asBoolean()).isTrue();
    assertThat(auditLines(id)).isEqualTo(linesAfterCreate + 1);
  }

  // ---- restore -------------------------------------------------------------------------------

  @Test
  void restoringADeletedHiddenProductKeepsItHidden() {
    var client = loggedInClient();
    long id = create(client, "Nếp ẩn");
    client.delete("/admin/products/" + id);

    var response = client.post("/admin/audit/" + auditId(id, "DELETE") + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(stored(id)).isFalse();
  }

  @Test
  void restoringTheLineOfAHideShowsTheProductAgain() {
    var client = loggedInClient();
    long id = create(client, "Nếp");
    client.post("/admin/products/" + id + "/show", Map.of());
    client.post("/admin/products/" + id + "/hide", Map.of());
    long hideLine =
        jdbc.queryForObject(
            "select max(id) from audit_log where entity_type = 'product' and entity_id = ?",
            Long.class,
            id);

    var response = client.post("/admin/audit/" + hideLine + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(stored(id)).isTrue();
    assertThat(publicNames()).containsExactly("Nếp");
  }

  @Test
  void aSnapshotFromBeforeTheSwitchExistedRestoresTheProductAsShown() {
    var client = loggedInClient();
    long id = create(client, "Nếp cũ");
    client.delete("/admin/products/" + id);
    long line = auditId(id, "DELETE");
    // Snapshots written before migration V3 have no "visible": every product was on the website.
    jdbc.update("update audit_log set before_json = before_json - 'visible' where id = ?", line);

    var response = client.post("/admin/audit/" + line + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(stored(id)).isTrue();
  }

  // ---- errors and access ---------------------------------------------------------------------

  @Test
  void anUnknownIdAnswers404() {
    var client = loggedInClient();

    for (String action : List.of("show", "hide")) {
      var response = client.post("/admin/products/999999/" + action, Map.of());
      assertThat(response.getStatusCode().value()).isEqualTo(404);
      assertThat(ApiClient.json(response).path("detail").asString()).isEqualTo(NOT_FOUND);
    }
  }

  @Test
  void aVisitorWhoIsNotLoggedInCannotShowAProduct() {
    var owner = loggedInClient();
    long id = create(owner, "Nếp");
    var visitor = newClient();
    visitor.fetchCsrf();

    var response = visitor.post("/admin/products/" + id + "/show", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(401);
    assertThat(stored(id)).isFalse();
  }

  // ---- helpers -------------------------------------------------------------------------------

  private long create(ApiClient client, String nameVi) {
    var response = client.post("/admin/products", body(nameVi));
    assertThat(response.getStatusCode().value()).isEqualTo(201);
    return ApiClient.json(response).path("id").asLong();
  }

  private List<String> publicNames() {
    return publicNames("vi");
  }

  private List<String> publicNames(String lang) {
    JsonNode products = ApiClient.json(newClient().get("/public/" + lang + "/home")).path("products");
    return products.valueStream().map(product -> product.path("name").asString()).toList();
  }

  private boolean stored(long id) {
    return jdbc.queryForObject("select visible from product where id = ?", Boolean.class, id);
  }

  private int auditLines(long id) {
    return jdbc.queryForObject(
        "select count(*) from audit_log where entity_type = 'product' and entity_id = ?",
        Integer.class,
        id);
  }

  private long auditId(long id, String action) {
    return jdbc.queryForObject(
        "select id from audit_log where entity_type = 'product' and entity_id = ? and action = ?"
            + " order by id limit 1",
        Long.class,
        id,
        action);
  }

  private static Map<String, Object> body(String nameVi) {
    var body = new LinkedHashMap<String, Object>();
    body.put("sortOrder", 0);
    body.put("showPrice", false);
    body.put("name", text(nameVi, "Sticky rice"));
    body.put("features", Map.of("vi", List.of("Dẻo"), "en", List.of("Soft")));
    body.put("packagings", List.of(Map.of("weightGrams", 1000)));
    body.put("mediaIds", List.of());
    return body;
  }

  private static Map<String, Object> text(String vi, String en) {
    var text = new LinkedHashMap<String, Object>();
    text.put("vi", vi);
    text.put("en", en);
    return text;
  }
}
