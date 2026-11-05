package vn.nepnhaxudong.auth;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Time-based one-time passwords of RFC 6238 (HMAC-SHA1, 6 digits, 30-second step) in pure Java. The
 * caller gives the time as epoch seconds, so the clock stays under the control of the caller. A code
 * of the current step, the step before and the step after is accepted, to allow for clock drift.
 * Neither secrets nor codes are logged here.
 */
public final class Totp {

  public static final int DIGITS = 6;
  public static final int STEP_SECONDS = 30;

  private static final int SECRET_BYTES = 20;
  private static final int ALLOWED_DRIFT_STEPS = 1;
  private static final int MODULUS = 1_000_000;
  private static final String HMAC_ALGORITHM = "HmacSHA1";
  private static final SecureRandom RANDOM = new SecureRandom();

  private Totp() {}

  /** A new secret: 20 random bytes in Base32 (32 characters). */
  public static String generateSecret() {
    byte[] bytes = new byte[SECRET_BYTES];
    RANDOM.nextBytes(bytes);
    return Base32.encode(bytes);
  }

  /** The 6-digit code of the step that contains {@code epochSeconds}. */
  public static String code(String base32Secret, long epochSeconds) {
    return codeOfStep(Base32.decode(base32Secret), Math.floorDiv(epochSeconds, STEP_SECONDS));
  }

  /** True when the code is valid for the current step or one step before or after. */
  public static boolean verify(String base32Secret, String code, long epochSeconds) {
    return matchedStep(base32Secret, code, epochSeconds) != NO_STEP;
  }

  /** {@link #matchedStep} when the code is not valid. */
  public static final long NO_STEP = Long.MIN_VALUE;

  /**
   * The time step whose code equals {@code code} (the current step or one step before or after), or
   * {@link #NO_STEP}. The caller keeps the step to refuse a second use of the same code.
   */
  public static long matchedStep(String base32Secret, String code, long epochSeconds) {
    if (code == null || code.length() != DIGITS || !code.chars().allMatch(c -> c >= '0' && c <= '9')) {
      return NO_STEP;
    }
    byte[] key = Base32.decode(base32Secret);
    byte[] given = code.getBytes(StandardCharsets.US_ASCII);
    long step = Math.floorDiv(epochSeconds, STEP_SECONDS);
    long matched = NO_STEP;
    // Every step is computed and compared in constant time; the loop never stops early.
    for (long candidate = step - ALLOWED_DRIFT_STEPS; candidate <= step + ALLOWED_DRIFT_STEPS; candidate++) {
      byte[] expected = codeOfStep(key, candidate).getBytes(StandardCharsets.US_ASCII);
      if (MessageDigest.isEqual(expected, given)) {
        matched = candidate;
      }
    }
    return matched;
  }

  private static String codeOfStep(byte[] key, long step) {
    byte[] hash = hmac(key, ByteBuffer.allocate(Long.BYTES).putLong(step).array());
    int offset = hash[hash.length - 1] & 0x0F;
    int binary =
        ((hash[offset] & 0x7F) << 24)
            | ((hash[offset + 1] & 0xFF) << 16)
            | ((hash[offset + 2] & 0xFF) << 8)
            | (hash[offset + 3] & 0xFF);
    return String.format("%0" + DIGITS + "d", binary % MODULUS);
  }

  private static byte[] hmac(byte[] key, byte[] message) {
    try {
      Mac mac = Mac.getInstance(HMAC_ALGORITHM);
      mac.init(new SecretKeySpec(key, HMAC_ALGORITHM));
      return mac.doFinal(message);
    } catch (GeneralSecurityException e) {
      // HmacSHA1 is part of every Java runtime; a failure here is a broken environment.
      throw new IllegalStateException("HmacSHA1 is not available", e);
    }
  }
}
