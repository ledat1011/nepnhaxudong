package vn.nepnhaxudong.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.text.Normalizer;
import org.junit.jupiter.api.Test;

class SlugGeneratorTest {

  @Test
  void removesVietnameseMarksAndJoinsWordsWithDashes() {
    assertThat(SlugGenerator.slugify("Câu chuyện mùa gặt ở Duy Tân"))
        .isEqualTo("cau-chuyen-mua-gat-o-duy-tan");
  }

  @Test
  void turnsTheLetterDWithStrokeIntoD() {
    assertThat(SlugGenerator.slugify("Đồng lúa đẹp")).isEqualTo("dong-lua-dep");
  }

  @Test
  void collapsesSpacesAndPunctuationAndTrimsTheEnds() {
    assertThat(SlugGenerator.slugify("  Xôi   NẾP!! ")).isEqualTo("xoi-nep");
  }

  @Test
  void worksWithTextInDecomposedForm() {
    String decomposed = Normalizer.normalize("Nếp cái", Normalizer.Form.NFD);

    assertThat(SlugGenerator.slugify(decomposed)).isEqualTo("nep-cai");
  }

  @Test
  void keepsDigits() {
    assertThat(SlugGenerator.slugify("Mùa gặt 2024")).isEqualTo("mua-gat-2024");
  }

  @Test
  void cutsALongTextToAtMost80CharactersWithoutATrailingDash() {
    String text = "ab ".repeat(100);

    String slug = SlugGenerator.slugify(text);

    assertThat(slug.length()).isLessThanOrEqualTo(80);
    assertThat(slug).doesNotEndWith("-").doesNotStartWith("-");
    assertThat(slug).startsWith("ab-ab-ab");
  }

  @Test
  void aCutThatEndsOnADashDoesNotLeaveTheDash() {
    // Characters 80 and 81 are "-" and "x": the cut at 80 would end on a dash.
    String text = "a".repeat(79) + " x";

    assertThat(SlugGenerator.slugify(text)).isEqualTo("a".repeat(79));
  }

  @Test
  void textWithoutLettersOrDigitsGivesAnEmptySlug() {
    assertThat(SlugGenerator.slugify("🌾🌾")).isEmpty();
    assertThat(SlugGenerator.slugify("  !! ")).isEmpty();
    assertThat(SlugGenerator.slugify("")).isEmpty();
    assertThat(SlugGenerator.slugify(null)).isEmpty();
  }

  @Test
  void slugifyOfASlugChangesNothing() {
    String slug = SlugGenerator.slugify("Câu chuyện mùa gặt ở Duy Tân");

    assertThat(SlugGenerator.slugify(slug)).isEqualTo(slug);
  }
}
