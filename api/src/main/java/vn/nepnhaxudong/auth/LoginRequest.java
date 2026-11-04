package vn.nepnhaxudong.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** {@code totpCode} is needed only when the user has switched on two-factor login. */
public record LoginRequest(
    @NotBlank(message = "Email không được để trống.")
        @Size(max = 320, message = "Email quá dài.")
        String email,
    @NotBlank(message = "Mật khẩu không được để trống.")
        @Size(max = PasswordRules.MAX_LENGTH, message = "Mật khẩu quá dài.")
        String password,
    @Size(max = 16, message = "Mã xác thực không đúng.") String totpCode) {}
