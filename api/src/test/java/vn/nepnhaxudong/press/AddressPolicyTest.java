package vn.nepnhaxudong.press;

import static org.assertj.core.api.Assertions.assertThat;

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
}
