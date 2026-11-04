package vn.nepnhaxudong.site;

import tools.jackson.databind.JsonNode;

/** A setting row as the audit log keeps it: the row id, the key and the stored JSON object. */
public record SiteSettingAdminDto(long id, String key, JsonNode value) {}
