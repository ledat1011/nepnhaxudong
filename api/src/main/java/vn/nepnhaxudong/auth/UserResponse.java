package vn.nepnhaxudong.auth;

/**
 * The signed-in user. {@code role} tells the admin web whether to show account management;
 * {@code mustSetupTotp} sends the user to the two-factor setup before anything else.
 */
public record UserResponse(
    Long id,
    String email,
    String displayName,
    boolean mustChangePassword,
    UserRole role,
    boolean mustSetupTotp) {

  static UserResponse of(AppUser user) {
    return new UserResponse(
        user.getId(),
        user.getEmail(),
        user.getDisplayName(),
        user.isMustChangePassword(),
        user.getRole(),
        user.isMustSetupTotp());
  }
}
