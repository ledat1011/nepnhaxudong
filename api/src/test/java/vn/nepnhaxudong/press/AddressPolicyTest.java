package vn.nepnhaxudong.press;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.UnknownHostException;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;

/** Address literals only: no name lookup happens, so the test needs no network. */
class AddressPolicyTest {

  @ParameterizedTest
  @ValueSource(
      strings = {
        "127.0.0.1",
        "127.255.255.254",
        "0.0.0.0",
        "0.1.2.3",
        "10.0.0.1",
        "10.255.255.255",
        "172.16.0.1",
        "172.31.255.255",
        "192.168.0.1",
        "169.254.169.254",
        "100.64.0.1",
        "100.127.255.255",
        "192.0.0.8",
        "198.18.0.1",
        "198.19.255.255",
        "224.0.0.1",
        "239.255.255.255",
        "240.0.0.1",
        "255.255.255.255",
        "::",
        "::1",
        "fe80::1",
        "fc00::1",
        "fd12:3456:789a::1",
        "ff02::1",
        "::ffff:127.0.0.1",
        "::ffff:10.0.0.1",
        "::127.0.0.1",
        "64:ff9b::7f00:1",
        "64:ff9b::a00:1",
        "2002:7f00:1::1",
        "2002:c0a8:101::1"
      })
  void internalAddressesAreRefused(String literal) throws UnknownHostException {
    InetAddress address = InetAddress.getByName(literal);

    assertThat(AddressPolicy.isInternal(address)).as(literal).isTrue();
    assertThat(new AddressPolicy(true).allows(address)).as(literal).isFalse();
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "8.8.8.8",
        "1.1.1.1",
        "93.184.216.34",
        "172.15.255.255",
        "172.32.0.1",
        "100.63.255.255",
        "100.128.0.1",
        "198.17.255.255",
        "198.20.0.1",
        "223.255.255.255",
        "2606:4700:4700::1111",
        "2001:4860:4860::8888",
        "64:ff9b::808:808",
        "2002:808:808::1"
      })
  void publicAddressesAreAllowed(String literal) throws UnknownHostException {
    InetAddress address = InetAddress.getByName(literal);

    assertThat(AddressPolicy.isInternal(address)).as(literal).isFalse();
    assertThat(new AddressPolicy(true).allows(address)).as(literal).isTrue();
  }

  @Test
  void theSwitchOffAllowsEveryAddress() throws UnknownHostException {
    var policy = new AddressPolicy(false);

    assertThat(policy.allows(InetAddress.getByName("127.0.0.1"))).isTrue();
    assertThat(policy.allows(InetAddress.getByName("10.0.0.1"))).isTrue();
  }

  // ---- addresses as the resolver can return them (always an Inet6Address) --------------------

  @ParameterizedTest
  @ValueSource(
      strings = {
        "0:0:0:0:0:ffff:7f00:1", // ::ffff:127.0.0.1
        "0:0:0:0:0:ffff:a9fe:a9fe", // ::ffff:169.254.169.254
        "0:0:0:0:0:ffff:a00:1", // ::ffff:10.0.0.1
        "0:0:0:0:0:ffff:0:0", // ::ffff:0.0.0.0
        "0:0:0:0:0:0:7f00:1", // ::127.0.0.1
        "0:0:0:0:0:0:0:1", // ::1
        "0:0:0:0:0:0:0:0", // ::
        "64:ff9b:0:0:0:0:7f00:1", // 64:ff9b::127.0.0.1
        "64:ff9b:0:0:0:0:a9fe:a9fe",
        "64:ff9b:1:0:0:0:7f00:1", // 64:ff9b:1::/48, local-use NAT64 prefix
        "2002:7f00:1:0:0:0:0:0", // 6to4 of 127.0.0.1
        "2002:a00:1::1", // 6to4 of 10.0.0.1
        "2001:0:4136:e378:8000:63bf:80ff:fefe", // Teredo, client 127.0.0.1
        "fc00:0:0:0:0:0:0:1",
        "fd12:3456:789a:0:0:0:0:1",
        "fe80:0:0:0:0:0:0:1",
        "fec0:0:0:0:0:0:0:1",
        "ff02:0:0:0:0:0:0:1",
        "100:0:0:0:0:0:0:1", // discard prefix, not in 2000::/3
        "4000:0:0:0:0:0:0:1", // not in 2000::/3
        "e000:0:0:0:0:0:0:1"
      })
  void internalIpv6AddressesAreRefusedEvenWhenTheyAreNotLiterals(String groups) {
    InetAddress address = v6(groups);

    assertThat(address).isInstanceOf(Inet6Address.class);
    assertThat(AddressPolicy.isInternal(address)).as(groups).isTrue();
    assertThat(new AddressPolicy(true).allows(address)).as(groups).isFalse();
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "2001:4860:4860:0:0:0:0:8888", // Google DNS, not Teredo (2001:0000::/32 only)
        "2606:4700:4700:0:0:0:0:1111",
        "2a00:1450:4001:0:0:0:0:200e",
        "0:0:0:0:0:ffff:808:808", // ::ffff:8.8.8.8
        "64:ff9b:0:0:0:0:808:808", // NAT64 of 8.8.8.8
        "2002:808:808:0:0:0:0:1", // 6to4 of 8.8.8.8
        "2001:0:4136:e378:8000:63bf:f7f7:f7f7" // Teredo, client 8.8.8.8
      })
  void publicIpv6AddressesAreAllowed(String groups) {
    InetAddress address = v6(groups);

    assertThat(AddressPolicy.isInternal(address)).as(groups).isFalse();
    assertThat(new AddressPolicy(true).allows(address)).as(groups).isTrue();
  }

  /** Builds an Inet6Address from eight groups; getByAddress would turn IPv4-mapped into IPv4. */
  private static InetAddress v6(String groups) {
    String[] parts = groups.contains("::") ? expand(groups) : groups.split(":");
    byte[] bytes = new byte[16];
    for (int i = 0; i < 8; i++) {
      int value = Integer.parseInt(parts[i], 16);
      bytes[2 * i] = (byte) (value >> 8);
      bytes[2 * i + 1] = (byte) value;
    }
    try {
      return Inet6Address.getByAddress(null, bytes, -1);
    } catch (UnknownHostException e) {
      throw new IllegalStateException(e);
    }
  }

  private static String[] expand(String groups) {
    String[] sides = groups.split("::", -1);
    String[] head = sides[0].isEmpty() ? new String[0] : sides[0].split(":");
    String[] tail = sides[1].isEmpty() ? new String[0] : sides[1].split(":");
    String[] all = new String[8];
    java.util.Arrays.fill(all, "0");
    System.arraycopy(head, 0, all, 0, head.length);
    System.arraycopy(tail, 0, all, 8 - tail.length, tail.length);
    return all;
  }
}
