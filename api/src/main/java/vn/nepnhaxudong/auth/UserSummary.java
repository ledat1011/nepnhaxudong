package vn.nepnhaxudong.auth;

/** A family account as the admin area shows it. It never carries the password hash or the TOTP secret. */
public record UserSummary(
    Long id,
    String email,
    String displayName,
    boolean enabled,
    boolean totpEnabled,
    boolean mustChangePassword,
    UserRole role,
    boolean mustSetupTotp) {

  static UserSummary of(AppUser user) {
    return new UserSummary(
        user.getId(),
        user.getEmail(),
        user.getDisplayName(),
        user.isEnabled(),
        user.isTotpEnabled(),
        user.isMustChangePassword(),
        user.getRole(),
        user.isMustSetupTotp());
  }
}
