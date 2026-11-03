package vn.nepnhaxudong.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** {@code totpCode} is accepted for later use; two-factor login is not implemented yet. */
public record LoginRequest(
    @NotBlank(message = "Email không được để trống.")
        @Size(max = 320, message = "Email quá dài.")
        String email,
    @NotBlank(message = "Mật khẩu không được để trống.")
        @Size(max = PasswordRules.MAX_LENGTH, message = "Mật khẩu quá dài.")
        String password,
    String totpCode) {}
