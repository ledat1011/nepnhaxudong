package vn.nepnhaxudong.auth;

import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nepnhaxudong.common.ApiException;

/** Family account management. Every logged-in family member has the same rights. */
@Service
public class UserAdminService {

  private final AppUserRepository users;
  private final PasswordEncoder encoder;
  private final UserSessions userSessions;

  public UserAdminService(
      AppUserRepository users, PasswordEncoder encoder, UserSessions userSessions) {
    this.users = users;
    this.encoder = encoder;
    this.userSessions = userSessions;
  }

  @Transactional(readOnly = true)
  public List<UserSummary> list() {
    return users.findAll(Sort.by("id")).stream().map(UserSummary::of).toList();
  }

  @Transactional
  public UserSummary create(CreateUserRequest request) {
    String email = AppUser.normalizeEmail(request.email());
    if (users.findByEmail(email).isPresent()) {
      throw emailInUse();
    }
    var user =
        AppUser.create(email, request.displayName().trim(), encoder.encode(request.temporaryPassword()), true);
    try {
      return UserSummary.of(users.saveAndFlush(user));
    } catch (DataIntegrityViolationException e) {
      // Another request created the same email between the check and the insert.
      throw emailInUse();
    }
  }

  /** Disables a user and ends all their sessions. Nobody can disable their own account. */
  @Transactional
  public void disable(long actorId, long targetId) {
    if (actorId == targetId) {
      throw new ApiException(HttpStatus.CONFLICT, "Bạn không thể khóa tài khoản của chính mình.");
    }
    AppUser user = find(targetId);
    user.setEnabled(false);
    userSessions.endAll(targetId);
  }

  @Transactional
  public void enable(long targetId) {
    find(targetId).setEnabled(true);
  }

  /**
   * Sets a temporary password: the user must change it at the next login, the lock is cleared and
   * every session of the user ends.
   */
  @Transactional
  public void resetPassword(long targetId, String temporaryPassword) {
    AppUser user = find(targetId);
    user.setPasswordHash(encoder.encode(temporaryPassword));
    user.setMustChangePassword(true);
    user.setFailedAttempts(0);
    user.setLockedUntil(null);
    userSessions.endAll(targetId);
  }

  private AppUser find(long id) {
    return users
        .findById(id)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản."));
  }

  private static ApiException emailInUse() {
    return new ApiException(HttpStatus.CONFLICT, "Email đã được dùng.");
  }
}
