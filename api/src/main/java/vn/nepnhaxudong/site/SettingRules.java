package vn.nepnhaxudong.site;

import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import vn.nepnhaxudong.common.ApiException;
import vn.nepnhaxudong.common.LocalizedText;
import vn.nepnhaxudong.press.WebAddress;

/** The rules shared by the setting records. The messages name the field in Vietnamese. */
final class SettingRules {

  static final int MAX_PHONE_LENGTH = 30;
  static final int MAX_TEXT_LENGTH = 500;

  private static final Pattern PHONE = Pattern.compile("[0-9 +.\\-]+");

  private SettingRules() {}

  /** The text without surrounding spaces, or null when it is empty. */
  static String clean(String text) {
    if (text == null || text.isBlank()) {
      return null;
    }
    return text.strip();
  }

  /** Both languages cleaned; a missing text is a text with two null parts, never null. */
  static LocalizedText clean(LocalizedText text) {
    if (text == null) {
      return new LocalizedText(null, null);
    }
    return new LocalizedText(clean(text.vi()), clean(text.en()));
  }

  static void phone(String label, String value) {
    if (value == null) {
      return;
    }
    if (value.length() > MAX_PHONE_LENGTH || !PHONE.matcher(value).matches()) {
      throw invalid(
          label
              + " chỉ gồm chữ số, dấu cách, dấu +, dấu chấm và dấu gạch ngang, tối đa "
              + MAX_PHONE_LENGTH
              + " ký tự.");
    }
  }

  static void webAddress(String label, String value) {
    if (value != null && WebAddress.parse(value).isEmpty()) {
      throw invalid(
          label
              + " phải bắt đầu bằng http:// hoặc https:// và dài tối đa "
              + WebAddress.MAX_LENGTH
              + " ký tự.");
    }
  }

  /** English text needs Vietnamese text next to it, like every bilingual content of the site. */
  static void text(String label, LocalizedText text) {
    if (text.vi() == null && text.en() != null) {
      throw invalid(label + " (tiếng Việt) không được để trống khi đã có nội dung tiếng Anh.");
    }
    if (length(text.vi()) > MAX_TEXT_LENGTH || length(text.en()) > MAX_TEXT_LENGTH) {
      throw invalid(label + " dài tối đa " + MAX_TEXT_LENGTH + " ký tự.");
    }
  }

  private static int length(String text) {
    return text == null ? 0 : text.length();
  }

  private static ApiException invalid(String detail) {
    return new ApiException(HttpStatus.BAD_REQUEST, detail);
  }
}
