package vn.nepnhaxudong.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class TotpTest {

  /** The ASCII secret "12345678901234567890" of the RFC 6238 test vectors, in Base32. */
  private static final String RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

  @Test
  void matchesTheRfc6238TestVectors() {
    // The RFC lists 8-digit codes; the 6-digit code is the last six digits.
    assertThat(Totp.code(RFC_SECRET, 59L)).isEqualTo("287082");
    assertThat(Totp.code(RFC_SECRET, 1111111109L)).isEqualTo("081804");
    assertThat(Totp.code(RFC_SECRET, 1234567890L)).isEqualTo("005924");
    assertThat(Totp.code(RFC_SECRET, 2000000000L)).isEqualTo("279037");
  }

  @Test
  void verifyAcceptsTheCurrentPreviousAndNextStep() {
    long now = 1111111109L;
    String current = Totp.code(RFC_SECRET, now);

    assertThat(Totp.verify(RFC_SECRET, current, now)).isTrue();
    assertThat(Totp.verify(RFC_SECRET, Totp.code(RFC_SECRET, now - 30), now)).isTrue();
    assertThat(Totp.verify(RFC_SECRET, Totp.code(RFC_SECRET, now + 30), now)).isTrue();
  }

  @Test
  void verifyRejectsACodeTwoStepsAway() {
    long now = 1111111109L;

    assertThat(Totp.verify(RFC_SECRET, Totp.code(RFC_SECRET, now - 60), now)).isFalse();
    assertThat(Totp.verify(RFC_SECRET, Totp.code(RFC_SECRET, now + 60), now)).isFalse();
  }

  @Test
  void verifyRejectsMalformedCodes() {
    long now = 59L;

    assertThat(Totp.verify(RFC_SECRET, null, now)).isFalse();
    assertThat(Totp.verify(RFC_SECRET, "", now)).isFalse();
    assertThat(Totp.verify(RFC_SECRET, "28708", now)).isFalse();
    assertThat(Totp.verify(RFC_SECRET, "2870820", now)).isFalse();
    assertThat(Totp.verify(RFC_SECRET, "28708a", now)).isFalse();
    assertThat(Totp.verify(RFC_SECRET, " 287082", now)).isFalse();
  }

  @Test
  void generatedSecretIsTwentyRandomBytesInBase32() {
    String first = Totp.generateSecret();
    String second = Totp.generateSecret();

    // 20 bytes = 160 bits = 32 Base32 characters, no padding.
    assertThat(first).matches("[A-Z2-7]{32}");
    assertThat(second).matches("[A-Z2-7]{32}");
    assertThat(first).isNotEqualTo(second);
    // A generated secret works end to end.
    assertThat(Totp.verify(first, Totp.code(first, 1000L), 1000L)).isTrue();
  }

  @Test
  void base32MatchesTheRfc4648Vectors() {
    assertThat(Base32.encode(new byte[0])).isEmpty();
    assertThat(Base32.encode("f".getBytes())).isEqualTo("MY");
    assertThat(Base32.encode("fo".getBytes())).isEqualTo("MZXQ");
    assertThat(Base32.encode("foo".getBytes())).isEqualTo("MZXW6");
    assertThat(Base32.encode("foob".getBytes())).isEqualTo("MZXW6YQ");
    assertThat(Base32.encode("fooba".getBytes())).isEqualTo("MZXW6YTB");
    assertThat(Base32.encode("foobar".getBytes())).isEqualTo("MZXW6YTBOI");

    assertThat(Base32.decode("MZXW6YTBOI")).isEqualTo("foobar".getBytes());
    assertThat(Base32.decode("mzxw6ytboi")).isEqualTo("foobar".getBytes());
    assertThat(Base32.decode("MZXW6YQ=")).isEqualTo("foob".getBytes());
    assertThat(Base32.decode(RFC_SECRET)).isEqualTo("12345678901234567890".getBytes());
  }

  @Test
  void base32RejectsCharactersOutsideTheAlphabet() {
    assertThatThrownBy(() -> Base32.decode("MZXW6YT1")).isInstanceOf(IllegalArgumentException.class);
  }
}
