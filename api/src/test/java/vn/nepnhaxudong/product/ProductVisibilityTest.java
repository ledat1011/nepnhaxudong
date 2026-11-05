package vn.nepnhaxudong.product;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.JsonNode;
import vn.nepnhaxudong.auth.ApiClient;
import vn.nepnhaxudong.auth.AuthTestSupport;
import vn.nepnhaxudong.common.LocalizedList;
import vn.nepnhaxudong.common.LocalizedText;

/**
 * The "Hiện trên web" switch of a product: a new product is hidden, show and hide change only the
 * switch, and the public home page lists only the products that are shown.
 */
class ProductVisibilityTest extends AuthTestSupport {

  private static final String NOT_FOUND = "Không tìm thấy sản phẩm.";

  @Autowired JdbcTemplate jdbc;
  @Autowired ProductService products;
  @Autowired ProductRepository repository;
  @Autowired TransactionTemplate transaction;

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
    assertThat(publicNames("en")).containsExactly("Sticky rice");

    var hidden = client.post("/admin/products/" + id + "/hide", Map.of());

    assertThat(hidden.getStatusCode().value()).isEqualTo(200);
    assertThat(ApiClient.json(hidden).path("visible").asBoolean()).isFalse();
    assertThat(stored(id)).isFalse();
    assertThat(publicNames()).isEmpty();
    assertThat(publicNames("en")).isEmpty();
  }

  @Test
  void theHomePageListsOnlyTheShownProductsInTheirOrder() {
    var client = loggedInClient();
    long hidden = create(client, "Ẩn", "Hidden");
    long second = create(client, "Hai", "Two");
    long first = create(client, "Một", "One");
    client.post("/admin/products/" + second + "/show", Map.of());
    client.post("/admin/products/" + first + "/show", Map.of());
    jdbc.update("update product set sort_order = 1 where id = ?", second);

    assertThat(publicNames()).containsExactly("Một", "Hai");
    assertThat(publicNames("en")).containsExactly("One", "Two");
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
  void restoringAnOlderEditKeepsTheProductHiddenWhenItIsHiddenNow() {
    var client = loggedInClient();
    long id = create(client, "Tên cũ");
    client.post("/admin/products/" + id + "/show", Map.of());
    client.put("/admin/products/" + id, body("Tên mới"));
    long edit = lastLine(id);
    client.post("/admin/products/" + id + "/hide", Map.of());

    var response = client.post("/admin/audit/" + edit + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(adminName(client, id)).isEqualTo("Tên cũ");
    assertThat(stored(id)).isFalse();
    assertThat(publicNames()).isEmpty();
  }

  @Test
  void restoringAnOlderEditKeepsTheProductShownWhenItIsShownNow() {
    var client = loggedInClient();
    long id = create(client, "Tên cũ");
    client.put("/admin/products/" + id, body("Tên mới"));
    long edit = lastLine(id);
    client.post("/admin/products/" + id + "/show", Map.of());

    var response = client.post("/admin/audit/" + edit + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(stored(id)).isTrue();
    assertThat(publicNames()).containsExactly("Tên cũ");
  }

  @Test
  void restoringAnEditFromBeforeTheSwitchExistedKeepsTheCurrentValue() {
    var client = loggedInClient();
    long id = create(client, "Tên cũ");
    client.put("/admin/products/" + id, body("Tên mới"));
    long edit = lastLine(id);
    // Lines written before migration V3 have no "visible" on either side.
    jdbc.update(
        "update audit_log set before_json = before_json - 'visible',"
            + " after_json = after_json - 'visible' where id = ?",
        edit);

    var response = client.post("/admin/audit/" + edit + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(adminName(client, id)).isEqualTo("Tên cũ");
    assertThat(stored(id)).isFalse();
  }

  @Test
  void restoringTheLineOfAHideShowsTheProductAgain() {
    var client = loggedInClient();
    long id = create(client, "Nếp");
    client.post("/admin/products/" + id + "/show", Map.of());
    client.post("/admin/products/" + id + "/hide", Map.of());

    var response = client.post("/admin/audit/" + lastLine(id) + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(stored(id)).isTrue();
    assertThat(publicNames()).containsExactly("Nếp");
  }

  @Test
  void restoringTheLineOfAShowHidesTheProductAgain() {
    var client = loggedInClient();
    long id = create(client, "Nếp");
    client.post("/admin/products/" + id + "/show", Map.of());

    var response = client.post("/admin/audit/" + lastLine(id) + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(stored(id)).isFalse();
  }

  @Test
  void aDeletedProductComesBackHiddenEvenWhenItWasShown() {
    var client = loggedInClient();
    long id = create(client, "Nếp hiện");
    client.post("/admin/products/" + id + "/show", Map.of());
    client.delete("/admin/products/" + id);

    var response = client.post("/admin/audit/" + auditId(id, "DELETE") + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(adminName(client, id)).isEqualTo("Nếp hiện");
    assertThat(stored(id)).isFalse();
    assertThat(publicNames()).isEmpty();
  }

  @Test
  void aDeletedProductFromBeforeTheSwitchExistedComesBackHidden() {
    var client = loggedInClient();
    long id = create(client, "Nếp cũ");
    client.delete("/admin/products/" + id);
    long line = auditId(id, "DELETE");
    jdbc.update("update audit_log set before_json = before_json - 'visible' where id = ?", line);

    var response = client.post("/admin/audit/" + line + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(stored(id)).isFalse();
  }

  // ---- writes at the same time ---------------------------------------------------------------

  @Test
  void aSaveFromAnOlderCopyNeverWritesTheSwitchBack() {
    long id = products.create(request("Nếp")).id();

    transaction.executeWithoutResult(
        status -> {
          // This transaction holds the product as it was: hidden.
          assertThat(repository.findById(id).orElseThrow().isVisible()).isFalse();
          // Meanwhile another request shows it and commits.
          jdbc.update("update product set visible = true where id = ?", id);
          products.update(id, request("Nếp, sửa"));
        });

    assertThat(stored(id)).isTrue();
  }

  @Test
  void twoShowsAtTheSameTimeWriteOneAuditLine() throws Exception {
    long id = products.create(request("Nếp")).id();
    var firstShown = new CountDownLatch(1);
    var executor = Executors.newSingleThreadExecutor();
    try {
      Future<?> first =
          executor.submit(
              () ->
                  transaction.executeWithoutResult(
                      status -> {
                        products.show(id);
                        firstShown.countDown();
                        // The first transaction stays open while the second show starts.
                        sleep(Duration.ofMillis(800));
                      }));
      assertThat(firstShown.await(10, TimeUnit.SECONDS)).isTrue();

      var second = products.show(id);

      first.get(10, TimeUnit.SECONDS);
      assertThat(second.visible()).isTrue();
    } finally {
      executor.shutdownNow();
    }
    assertThat(
            jdbc.queryForObject(
                "select count(*) from audit_log where entity_type = 'product' and entity_id = ?"
                    + " and action = 'UPDATE'",
                Integer.class,
                id))
        .isEqualTo(1);
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
  void aVisitorWhoIsNotLoggedInCannotShowOrHideAProduct() {
    var owner = loggedInClient();
    long shown = create(owner, "Hiện");
    owner.post("/admin/products/" + shown + "/show", Map.of());
    long hidden = create(owner, "Ẩn");
    var visitor = newClient();
    visitor.fetchCsrf();

    var show = visitor.post("/admin/products/" + hidden + "/show", Map.of());
    var hide = visitor.post("/admin/products/" + shown + "/hide", Map.of());

    assertThat(show.getStatusCode().value()).isEqualTo(401);
    assertThat(hide.getStatusCode().value()).isEqualTo(401);
    assertThat(stored(hidden)).isFalse();
    assertThat(stored(shown)).isTrue();
  }

  @Test
  void showAndHideWithoutTheCsrfHeaderAreRefusedWith403() {
    var owner = loggedInClient();
    long shown = create(owner, "Hiện");
    owner.post("/admin/products/" + shown + "/show", Map.of());
    long hidden = create(owner, "Ẩn");
    owner.useCsrfToken(null);

    var show = owner.post("/admin/products/" + hidden + "/show", Map.of());
    var hide = owner.post("/admin/products/" + shown + "/hide", Map.of());

    assertThat(show.getStatusCode().value()).isEqualTo(403);
    assertThat(hide.getStatusCode().value()).isEqualTo(403);
    assertThat(stored(hidden)).isFalse();
    assertThat(stored(shown)).isTrue();
  }

  // ---- helpers -------------------------------------------------------------------------------

  private long create(ApiClient client, String nameVi) {
    return create(client, nameVi, "Sticky rice");
  }

  private long create(ApiClient client, String nameVi, String nameEn) {
    var response = client.post("/admin/products", body(nameVi, nameEn));
    assertThat(response.getStatusCode().value()).isEqualTo(201);
    return ApiClient.json(response).path("id").asLong();
  }

  private String adminName(ApiClient client, long id) {
    return ApiClient.json(client.get("/admin/products/" + id)).path("name").path("vi").asString();
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

  private long lastLine(long id) {
    return jdbc.queryForObject(
        "select max(id) from audit_log where entity_type = 'product' and entity_id = ?",
        Long.class,
        id);
  }

  private static ProductRequest request(String nameVi) {
    return new ProductRequest(
        0,
        false,
        new LocalizedText(nameVi, "Sticky rice"),
        null,
        new LocalizedList(List.of("Dẻo"), List.of("Soft")),
        null,
        List.of(),
        List.of());
  }

  private static void sleep(Duration duration) {
    try {
      Thread.sleep(duration);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }

  private static Map<String, Object> body(String nameVi) {
    return body(nameVi, "Sticky rice");
  }

  private static Map<String, Object> body(String nameVi, String nameEn) {
    var body = new LinkedHashMap<String, Object>();
    body.put("sortOrder", 0);
    body.put("showPrice", false);
    body.put("name", text(nameVi, nameEn));
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
