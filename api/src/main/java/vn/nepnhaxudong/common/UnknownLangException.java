package vn.nepnhaxudong.common;

import org.springframework.http.HttpStatus;

/** A URL asked for a language the site does not have. */
public class UnknownLangException extends ApiException {

  public UnknownLangException(String lang) {
    super(HttpStatus.NOT_FOUND, "Không có ngôn ngữ \"" + lang + "\".");
  }
}
