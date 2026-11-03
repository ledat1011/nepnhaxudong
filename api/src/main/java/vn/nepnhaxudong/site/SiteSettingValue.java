package vn.nepnhaxudong.site;

/**
 * The value of one setting key. The same record is the request body of PUT, the answer of GET, and
 * the JSON stored in the database. Blank texts are already turned into {@code null} when the record
 * is built.
 */
public interface SiteSettingValue {

  /** Checks the rules of the fields; answers 400 in Vietnamese when one is broken. */
  void validate();
}
