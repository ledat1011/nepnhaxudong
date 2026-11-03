package vn.nepnhaxudong.auth;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordChangeService {

  private final AppUserRepository users;
  private final PasswordEncoder encoder;
  private final UserSessions userSessions;

  public PasswordChangeService(
      AppUserRepository users, PasswordEncoder encoder, UserSessions userSessions) {
    this.users = users;
    this.encoder = encoder;
    this.userSessions = userSessions;
  }

  /**
   * Changes the password and ends every other session of the user, so a stolen session or a session
   * on a lost device stops working. The session with id {@code currentSessionId} stays.
   */
  @Transactional
  public void change(long userId, String currentPassword, String newPassword, String currentSessionId) {
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
    userSessions.endAllExcept(userId, currentSessionId);
  }
}
