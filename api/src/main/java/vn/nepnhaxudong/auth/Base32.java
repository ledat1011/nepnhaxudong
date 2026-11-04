package vn.nepnhaxudong.auth;

import java.io.ByteArrayOutputStream;

/** Base32 of RFC 4648 (alphabet A-Z, 2-7). Encoding writes no padding; decoding accepts it. */
final class Base32 {

  private static final String ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  private static final int BITS_PER_CHARACTER = 5;
  private static final int BITS_PER_BYTE = 8;
  private static final int CHARACTER_MASK = 0x1F;

  private Base32() {}

  static String encode(byte[] data) {
    var result = new StringBuilder((data.length * BITS_PER_BYTE + BITS_PER_CHARACTER - 1) / BITS_PER_CHARACTER);
    int buffer = 0;
    int bits = 0;
    for (byte b : data) {
      buffer = (buffer << BITS_PER_BYTE) | (b & 0xFF);
      bits += BITS_PER_BYTE;
      while (bits >= BITS_PER_CHARACTER) {
        result.append(ALPHABET.charAt((buffer >> (bits - BITS_PER_CHARACTER)) & CHARACTER_MASK));
        bits -= BITS_PER_CHARACTER;
      }
      buffer &= (1 << bits) - 1;
    }
    if (bits > 0) {
      result.append(ALPHABET.charAt((buffer << (BITS_PER_CHARACTER - bits)) & CHARACTER_MASK));
    }
    return result.toString();
  }

  /** Decodes upper or lower case text; trailing {@code =} padding is ignored. */
  static byte[] decode(String text) {
    var result = new ByteArrayOutputStream();
    int buffer = 0;
    int bits = 0;
    for (int i = 0; i < text.length(); i++) {
      char c = text.charAt(i);
      if (c == '=') {
        break;
      }
      int value = ALPHABET.indexOf(Character.toUpperCase(c));
      if (value < 0) {
        throw new IllegalArgumentException("Not a Base32 character at position " + i);
      }
      buffer = (buffer << BITS_PER_CHARACTER) | value;
      bits += BITS_PER_CHARACTER;
      if (bits >= BITS_PER_BYTE) {
        result.write((buffer >> (bits - BITS_PER_BYTE)) & 0xFF);
        bits -= BITS_PER_BYTE;
        buffer &= (1 << bits) - 1;
      }
    }
    return result.toByteArray();
  }
}
