package vn.nepnhaxudong.press;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Decides which addresses the press preview may connect to. By default it refuses every address
 * that is not on the public internet, so the server cannot be used to read internal services (SSRF).
 * The check can be switched off with {@code press.preview.block-internal-addresses=false}; only a
 * test does that, to let a local test server play the role of a newspaper.
 */
@Component
public class AddressPolicy {

  private static final int NAT64_PREFIX_LENGTH = 12;

  private final boolean blockInternal;

  public AddressPolicy(
      @Value("${press.preview.block-internal-addresses:true}") boolean blockInternal) {
    this.blockInternal = blockInternal;
  }

  public boolean allows(InetAddress address) {
    return !blockInternal || !isInternal(address);
  }

  /**
   * True for an address that must not be reached from the internet side: this machine, the private
   * ranges (RFC 1918), link-local, carrier-grade NAT (100.64.0.0/10), IPv6 unique-local
   * (fc00::/7), multicast, the unspecified address, and other reserved ranges. An IPv6 address
   * that carries an IPv4 address inside (IPv4-compatible, NAT64, 6to4) is judged by that IPv4
   * address.
   */
  static boolean isInternal(InetAddress address) {
    if (address.isAnyLocalAddress()
        || address.isLoopbackAddress()
        || address.isLinkLocalAddress()
        || address.isSiteLocalAddress()
        || address.isMulticastAddress()) {
      return true;
    }
    byte[] bytes = address.getAddress();
    if (address instanceof Inet4Address) {
      return isInternalV4(bytes);
    }
    int first = bytes[0] & 0xff;
    if ((first & 0xfe) == 0xfc) {
      return true;
    }
    if (isZero(bytes, 0, NAT64_PREFIX_LENGTH)) {
      return isInternalV4(Arrays.copyOfRange(bytes, 12, 16));
    }
    if (isNat64WellKnownPrefix(bytes)) {
      return isInternalV4(Arrays.copyOfRange(bytes, 12, 16));
    }
    if (first == 0x20 && (bytes[1] & 0xff) == 0x02) {
      return isInternalV4(Arrays.copyOfRange(bytes, 2, 6));
    }
    return false;
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

  /** 64:ff9b::/96, the well-known prefix that maps IPv4 addresses into IPv6. */
  private static boolean isNat64WellKnownPrefix(byte[] bytes) {
    return (bytes[0] & 0xff) == 0x00
        && (bytes[1] & 0xff) == 0x64
        && (bytes[2] & 0xff) == 0xff
        && (bytes[3] & 0xff) == 0x9b
        && isZero(bytes, 4, 12);
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
