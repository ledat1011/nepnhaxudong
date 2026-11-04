package vn.nepnhaxudong.audit;

import java.util.Map;
import tools.jackson.databind.JsonNode;

/** A short human name of the content an audit line is about, read from the stored JSON only. */
public final class AuditLabels {

  private static final String SITE_SETTING = "site_setting";
  private static final Map<String, String> SETTING_NAMES =
      Map.of("contact", "Liên hệ", "social", "Mạng xã hội", "brand", "Thương hiệu");

  private AuditLabels() {}

  /**
   * The text of the first of {@code name.vi}, {@code title.vi}, {@code displayName}, {@code email},
   * {@code altVi} that is not blank, taken from the after snapshot (the before snapshot when there
   * is no after). A site setting is named by its key. Without any, {@code "#" + entityId}.
   */
  public static String label(String entityType, long entityId, JsonNode before, JsonNode after) {
    JsonNode snapshot = present(after) ? after : before;
    if (present(snapshot)) {
      String label = SITE_SETTING.equals(entityType) ? settingName(snapshot) : firstName(snapshot);
      if (label != null) {
        return label;
      }
    }
    return "#" + entityId;
  }

  private static String settingName(JsonNode snapshot) {
    String key = text(snapshot.path("key"));
    return key == null ? null : SETTING_NAMES.getOrDefault(key, key);
  }

  private static String firstName(JsonNode snapshot) {
    String[] candidates = {
      text(snapshot.path("name").path("vi")),
      text(snapshot.path("title").path("vi")),
      text(snapshot.path("displayName")),
      text(snapshot.path("email")),
      text(snapshot.path("altVi"))
    };
    for (String candidate : candidates) {
      if (candidate != null) {
        return candidate;
      }
    }
    return null;
  }

  private static boolean present(JsonNode node) {
    return node != null && !node.isNull() && !node.isMissingNode();
  }

  /** The trimmed text of a string node, or null when the node is not a string or is blank. */
  private static String text(JsonNode node) {
    if (!node.isString()) {
      return null;
    }
    String value = node.asString().trim();
    return value.isEmpty() ? null : value;
  }
}
