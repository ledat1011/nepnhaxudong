package vn.nepnhaxudong.auth;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriUtils;
import vn.nepnhaxudong.common.ApiException;

/** Switches two-factor login (TOTP) on and off for the logged-in user. */
@Service
public class TotpService {

  private static final String ISSUER = "Nep Nha";
  private static final String WRONG_CODE = "Mã xác thực không đúng.";

  private final AppUserRepository users;
  private final Clock clock;

  public TotpService(AppUserRepository users, Clock clock) {
    this.users = users;
    this.clock = clock;
  }

  /**
   * Creates a new secret for a user who has no active two-factor login. The secret is stored but
   * does not take effect until {@link #enable} gets a correct code. A user who already has it
   * switched on must switch it off first (with a code), so nobody can replace the secret without it.
   */
  @Transactional
  public TotpSetupResponse setup(long userId) {
    AppUser user = find(userId);
    if (user.isTotpEnabled()) {
      throw new ApiException(HttpStatus.CONFLICT, "Xác thực 2 lớp đã được bật. Hãy tắt trước khi tạo mã mới.");
    }
    String secret = Totp.generateSecret();
    user.setTotpSecret(secret);
    return new TotpSetupResponse(secret, otpauthUri(user.getEmail(), secret));
  }

  @Transactional
  public void enable(long userId, String code) {
    AppUser user = find(userId);
    if (user.isTotpEnabled()) {
      throw new ApiException(HttpStatus.CONFLICT, "Xác thực 2 lớp đã được bật.");
    }
    if (user.getTotpSecret() == null) {
      throw new ApiException(HttpStatus.CONFLICT, "Hãy tạo mã bí mật trước khi bật xác thực 2 lớp.");
    }
    requireValid(user, code);
    user.setTotpEnabled(true);
  }

  @Transactional
  public void disable(long userId, String code) {
    AppUser user = find(userId);
    if (!user.isTotpEnabled()) {
      throw new ApiException(HttpStatus.CONFLICT, "Xác thực 2 lớp chưa được bật.");
    }
    requireValid(user, code);
    user.setTotpEnabled(false);
    user.setTotpSecret(null);
  }

  private void requireValid(AppUser user, String code) {
    if (!Totp.verify(user.getTotpSecret(), code.trim(), clock.instant().getEpochSecond())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, WRONG_CODE);
    }
  }

  private AppUser find(long userId) {
    return users.findById(userId).orElseThrow(SessionExpiredException::new);
  }

  private static String otpauthUri(String email, String secret) {
    String issuer = UriUtils.encodePathSegment(ISSUER, StandardCharsets.UTF_8);
    String account = UriUtils.encodePathSegment(email, StandardCharsets.UTF_8);
    return "otpauth://totp/" + issuer + ":" + account + "?secret=" + secret + "&issuer=" + issuer;
  }
}
