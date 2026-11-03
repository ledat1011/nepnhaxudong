package vn.nepnhaxudong.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
    @NotBlank(message = "Email không được để trống.")
        @Size(max = 320, message = "Email quá dài.")
        @Email(message = "Email không hợp lệ.")
        String email,
    @NotBlank(message = "Tên hiển thị không được để trống.")
        @Size(max = 100, message = "Tên hiển thị quá dài.")
        String displayName,
    @NotBlank(message = "Mật khẩu tạm thời không được để trống.")
        @Size(min = PasswordRules.MIN_LENGTH, message = "Mật khẩu tạm thời phải có ít nhất 12 ký tự.")
        @Size(max = PasswordRules.MAX_LENGTH, message = "Mật khẩu tạm thời quá dài.")
        String temporaryPassword) {}
