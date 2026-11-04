package vn.nepnhaxudong.publicapi;

import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.common.LocalizedText;

/** Chooses a text by language for the public answers. A text that does not exist is "". */
final class PublicText {

  private PublicText() {}

  /** The English text for English when it exists, otherwise the Vietnamese text, otherwise "". */
  static String pick(Lang lang, String vi, String en) {
    String text = new LocalizedText(vi, en).resolve(lang);
    return text == null ? "" : text;
  }
}
