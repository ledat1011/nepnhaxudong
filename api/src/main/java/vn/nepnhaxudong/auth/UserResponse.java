package vn.nepnhaxudong.auth;

public record UserResponse(Long id, String email, String displayName, boolean mustChangePassword) {

  static UserResponse of(AppUser user) {
    return new UserResponse(
        user.getId(), user.getEmail(), user.getDisplayName(), user.isMustChangePassword());
  }
}
