package vn.nepnhaxudong.press;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Decides which addresses the press preview may connect to. By default it refuses every address
 * that is not on the public internet, so the server cannot be used to read internal services
 * (SSRF).
 * The check can be switched off with {@code press.preview.block-internal-addresses=false}; only a
 * test does that, to let a local test server play the role of a newspaper.
 */
@Component
public class AddressPolicy {

  private static final int IPV6_LENGTH = 16;
  private static final int IPV4_OFFSET = 12;

  private final boolean blockInternal;

  public AddressPolicy(
      @Value("${press.preview.block-internal-addresses:true}") boolean blockInternal) {
    this.blockInternal = blockInternal;
  }

  public boolean allows(InetAddress address) {
    return !blockInternal || !isInternal(address);
  }

  /**
   * True for an address that must not be reached from the internet side.
   *
   * <p>IPv4: this machine, the private ranges (RFC 1918), link-local, carrier-grade NAT
   * (100.64.0.0/10), the unspecified and reserved ranges, and multicast.
   *
   * <p>IPv6 is an allow-list: only {@code 2000::/3} (global unicast) is public. An address that
   * carries an IPv4 address inside is judged by the IPv4 rules: IPv4-mapped {@code ::ffff:0:0/96}
   * (the resolver can return these as an Inet6Address, and a dual-stack socket connects them to the
   * IPv4 address), IPv4-compatible {@code ::/96}, NAT64 {@code 64:ff9b::/96}, 6to4
   * {@code 2002::/16} and Teredo {@code 2001::/32}. The local-use NAT64 prefix
   * {@code 64:ff9b:1::/48} is internal. Every other IPv6 address is internal.
   */
  static boolean isInternal(InetAddress address) {
    byte[] bytes = address.getAddress();
    if (address instanceof Inet4Address || bytes.length == 4) {
      return isInternalV4(bytes);
    }
    if (bytes.length != IPV6_LENGTH) {
      return true;
    }
    if (isZero(bytes, 0, 10) && (bytes[10] & 0xff) == 0xff && (bytes[11] & 0xff) == 0xff) {
      return isInternalV4(Arrays.copyOfRange(bytes, IPV4_OFFSET, IPV6_LENGTH));
    }
    if (isZero(bytes, 0, IPV4_OFFSET)) {
      return isInternalV4(Arrays.copyOfRange(bytes, IPV4_OFFSET, IPV6_LENGTH));
    }
    if (hasPrefix(bytes, 0x00, 0x64, 0xff, 0x9b, 0x00, 0x00) && isZero(bytes, 6, IPV4_OFFSET)) {
      return isInternalV4(Arrays.copyOfRange(bytes, IPV4_OFFSET, IPV6_LENGTH));
    }
    if (hasPrefix(bytes, 0x00, 0x64, 0xff, 0x9b, 0x00, 0x01)) {
      return true;
    }
    if (hasPrefix(bytes, 0x20, 0x02)) {
      return isInternalV4(Arrays.copyOfRange(bytes, 2, 6));
    }
    if (hasPrefix(bytes, 0x20, 0x01, 0x00, 0x00)) {
      return isInternalV4(teredoClient(bytes));
    }
    return (bytes[0] & 0xe0) != 0x20;
  }

  /** The client IPv4 address of a Teredo address is its last 4 bytes, each XOR 0xff. */
  private static byte[] teredoClient(byte[] bytes) {
    byte[] client = Arrays.copyOfRange(bytes, IPV4_OFFSET, IPV6_LENGTH);
    for (int i = 0; i < client.length; i++) {
      client[i] = (byte) (client[i] ^ 0xff);
    }
    return client;
  }

  private static boolean isInternalV4(byte[] bytes) {
    int first = bytes[0] & 0xff;
    int second = bytes[1] & 0xff;
    int third = bytes[2] & 0xff;
    return first == 0
        || first == 10
        || first == 127
        || (first == 100 && (second & 0xc0) == 64)
        || (first == 169 && second == 254)
        || (first == 172 && (second & 0xf0) == 16)
        || (first == 192 && second == 168)
        || (first == 192 && second == 0 && third == 0)
        || (first == 198 && (second & 0xfe) == 18)
        || first >= 224;
  }

  private static boolean hasPrefix(byte[] bytes, int... prefix) {
    for (int i = 0; i < prefix.length; i++) {
      if ((bytes[i] & 0xff) != prefix[i]) {
        return false;
      }
    }
    return true;
  }

  private static boolean isZero(byte[] bytes, int from, int to) {
    for (int i = from; i < to; i++) {
      if (bytes[i] != 0) {
        return false;
      }
    }
    return true;
  }
}
