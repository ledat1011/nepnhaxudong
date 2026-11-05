package vn.nepnhaxudong.auth;

/**
 * The signed-in user. {@code role} tells the admin web whether to show account management;
 * {@code totpEnabled} is the state of the user's own two-factor card; {@code mustSetupTotp} sends
 * the user to the two-factor setup before anything else; {@code totpRequired} hides "switch off"
 * (only an owner may switch it off).
 */
public record UserResponse(
    Long id,
    String email,
    String displayName,
    boolean mustChangePassword,
    UserRole role,
    boolean totpEnabled,
    boolean mustSetupTotp,
    boolean totpRequired) {

  static UserResponse of(AppUser user) {
    return new UserResponse(
        user.getId(),
        user.getEmail(),
        user.getDisplayName(),
        user.isMustChangePassword(),
        user.getRole(),
        user.isTotpEnabled(),
        user.isMustSetupTotp(),
        user.isTotpRequired());
  }
}
