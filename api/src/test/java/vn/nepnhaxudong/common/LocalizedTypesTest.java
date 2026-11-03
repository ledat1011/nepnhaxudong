package vn.nepnhaxudong.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

class LocalizedTypesTest {

  @Test
  void langIsReadFromThePathInAnyCase() {
    assertThat(Lang.fromPath("vi")).isEqualTo(Lang.VI);
    assertThat(Lang.fromPath("EN")).isEqualTo(Lang.EN);
    assertThat(Lang.VI.code()).isEqualTo("vi");
  }

  @Test
  void anUnknownLanguageIsA404() {
    assertThatThrownBy(() -> Lang.fromPath("fr"))
        .isInstanceOf(UnknownLangException.class)
        .extracting(e -> ((UnknownLangException) e).getStatus().value())
        .isEqualTo(404);
    assertThatThrownBy(() -> Lang.fromPath(null)).isInstanceOf(UnknownLangException.class);
  }

  @Test
  void textResolvesToEnglishOnlyWhenItExists() {
    var both = new LocalizedText("Xin chào", "Hello");
    var viOnly = new LocalizedText("Xin chào", null);

    assertThat(both.resolve(Lang.EN)).isEqualTo("Hello");
    assertThat(both.resolve(Lang.VI)).isEqualTo("Xin chào");
    assertThat(viOnly.resolve(Lang.EN)).isEqualTo("Xin chào");
    assertThat(both.missingEn()).isFalse();
    assertThat(viOnly.missingEn()).isTrue();
  }

  @Test
  void blankTextBecomesNull() {
    var text = new LocalizedText("  ", "");

    assertThat(text.vi()).isNull();
    assertThat(text.en()).isNull();
    assertThat(text.missingEn()).isTrue();
  }

  @Test
  void listResolvesToEnglishOnlyWhenItIsNotEmpty() {
    var both = new LocalizedList(List.of("Dẻo"), List.of("Soft"));
    var viOnly = new LocalizedList(List.of("Dẻo"), null);

    assertThat(both.resolve(Lang.EN)).containsExactly("Soft");
    assertThat(viOnly.resolve(Lang.EN)).containsExactly("Dẻo");
    assertThat(viOnly.en()).isEmpty();
    assertThat(viOnly.missingEn()).isTrue();
    assertThat(both.missingEn()).isFalse();
  }

  @Test
  void listDropsBlankAndNullItems() {
    var list = new LocalizedList(Arrays.asList("Dẻo", " ", null, "Thơm"), List.of(""));

    assertThat(list.vi()).containsExactly("Dẻo", "Thơm");
    assertThat(list.en()).isEmpty();
  }
}
