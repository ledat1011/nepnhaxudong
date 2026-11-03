package vn.nepnhaxudong.story;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class StoryHtmlSanitizerTest {

  @Test
  void keepsTheAllowedTagsAndText() {
    String html =
        "<h2>Mùa gặt</h2><h3>Sáng sớm</h3><p>Một <strong>hạt</strong> <em>nếp</em></p>"
            + "<ul><li>a</li></ul><ol><li>b</li></ol><blockquote>câu nói</blockquote>";

    assertThat(StoryHtmlSanitizer.clean(html)).isEqualTo(html);
  }

  @Test
  void removesScriptTagsTogetherWithTheirContent() {
    assertThat(StoryHtmlSanitizer.clean("<p>x</p><script>alert(1)</script>")).isEqualTo("<p>x</p>");
  }

  @Test
  void removesEveryAttributeThatIsNotAllowed() {
    String cleaned =
        StoryHtmlSanitizer.clean(
            "<p onclick=\"alert(1)\" style=\"color:red\" class=\"x\"><strong id=\"y\">ok</strong></p>");

    assertThat(cleaned).isEqualTo("<p><strong>ok</strong></p>");
  }

  @Test
  void removesOtherTagsButKeepsTheirText() {
    assertThat(StoryHtmlSanitizer.clean("<div><span>chữ</span><iframe src=\"https://a.example\"></iframe></div>"))
        .isEqualTo("chữ");
  }

  @Test
  void keepsLinksWithWebMailAndPhoneAddresses() {
    for (String href :
        new String[] {
          "https://a.example/x?y=1", "http://a.example", "mailto:a@example.com", "tel:+84123456789"
        }) {
      String html = "<a href=\"" + href + "\">link</a>";

      assertThat(StoryHtmlSanitizer.clean(html)).as(href).isEqualTo(html);
    }
  }

  @Test
  void removesLinkAddressesWithOtherProtocols() {
    for (String href :
        new String[] {
          "javascript:alert(1)",
          "JaVaScRiPt:alert(1)",
          " javascript:alert(1)",
          "data:text/html;base64,PHNjcmlwdD4=",
          "vbscript:x",
          "ftp://a.example/x"
        }) {
      assertThat(StoryHtmlSanitizer.clean("<a href=\"" + href + "\">link</a>"))
          .as(href)
          .isEqualTo("<a>link</a>");
    }
  }

  @Test
  void keepsAnImageWithAnAbsoluteAddressAndAltText() {
    String html = "<img src=\"https://a.example/x.webp\" alt=\"Đồng lúa\">";

    assertThat(StoryHtmlSanitizer.clean(html)).isEqualTo(html);
  }

  @Test
  void keepsAnImageWithARelativeMediaPathUnchanged() {
    assertThat(StoryHtmlSanitizer.clean("<img src=\"/media/x.webp\" alt=\"a\">"))
        .isEqualTo("<img src=\"/media/x.webp\" alt=\"a\">");
  }

  @Test
  void removesTheSourceOfAnImageWithAnUnsafeProtocol() {
    for (String src :
        new String[] {"javascript:alert(1)", "data:image/svg+xml;base64,PHN2Zz4=", "mailto:a@b.c"}) {
      assertThat(StoryHtmlSanitizer.clean("<img src=\"" + src + "\" alt=\"a\" onerror=\"x()\">"))
          .as(src)
          .isEqualTo("<img alt=\"a\">");
    }
  }

  @Test
  void keepsAmpersandsAndVietnameseLettersReadable() {
    assertThat(StoryHtmlSanitizer.clean("<p>Nếp &amp; hoa vàng</p>"))
        .isEqualTo("<p>Nếp &amp; hoa vàng</p>");
  }

  @Test
  void doesNotAddLineBreaksOrIndentation() {
    assertThat(StoryHtmlSanitizer.clean("<ul><li>a</li><li>b</li></ul><p>c</p>"))
        .isEqualTo("<ul><li>a</li><li>b</li></ul><p>c</p>");
  }

  @Test
  void removesTheSourceOfAnImageThatIsNotAnAbsoluteWebAddressOrAMediaPath() {
    for (String src :
        new String[] {
          "/api/admin/stories",
          "/media/../api/admin/stories",
          "x.png",
          "//evil.com/x.png",
          "\\evil.com/x",
          "/media/%2e%2e/x",
          "/media/%2E%2E/x",
          "/media/a\\b.webp",
          "/other/a.webp"
        }) {
      assertThat(StoryHtmlSanitizer.clean("<img src=\"" + src + "\" alt=\"a\">"))
          .as(src)
          .isEqualTo("<img alt=\"a\">");
    }
  }

  @Test
  void keepsTheSourceOfAnImageWithAMediaPathOrAnAbsoluteWebAddress() {
    for (String src : new String[] {"/media/a.webp", "https://example.com/a.jpg", "http://example.com/a.jpg"}) {
      String html = "<img src=\"" + src + "\" alt=\"a\">";

      assertThat(StoryHtmlSanitizer.clean(html)).as(src).isEqualTo(html);
    }
  }

  @Test
  void keepsLinksToPathsOfThisSiteAndToPageFragments() {
    for (String href : new String[] {"/cau-chuyen/x", "#top"}) {
      String html = "<a href=\"" + href + "\">link</a>";

      assertThat(StoryHtmlSanitizer.clean(html)).as(href).isEqualTo(html);
    }
  }

  @Test
  void removesLinksToOtherSitesWrittenWithoutAProtocolAndRelativeFileNames() {
    for (String href : new String[] {"//evil.com", "\\evil.com", "x.html", "/a\\b", "javascript:alert(1)"}) {
      assertThat(StoryHtmlSanitizer.clean("<a href=\"" + href + "\">link</a>"))
          .as(href)
          .isEqualTo("<a>link</a>");
    }
  }
}
