package vn.nepnhaxudong.auth;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordChangeService {

  private final AppUserRepository users;
  private final PasswordEncoder encoder;

  public PasswordChangeService(AppUserRepository users, PasswordEncoder encoder) {
    this.users = users;
    this.encoder = encoder;
  }

  @Transactional
  public void change(long userId, String currentPassword, String newPassword) {
    AppUser user =
        users.findById(userId).filter(AppUser::isEnabled).orElseThrow(SessionExpiredException::new);
    if (!encoder.matches(currentPassword, user.getPasswordHash())) {
      throw new InvalidPasswordChangeException("Mật khẩu hiện tại không đúng.");
    }
    if (newPassword.length() < PasswordRules.MIN_LENGTH) {
      throw new InvalidPasswordChangeException("Mật khẩu mới phải có ít nhất 12 ký tự.");
    }
    if (newPassword.equals(currentPassword)) {
      throw new InvalidPasswordChangeException("Mật khẩu mới phải khác mật khẩu hiện tại.");
    }
    user.setPasswordHash(encoder.encode(newPassword));
    user.setMustChangePassword(false);
  }
}
