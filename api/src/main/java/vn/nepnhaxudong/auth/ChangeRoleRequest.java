package vn.nepnhaxudong.auth;

import jakarta.validation.constraints.NotNull;

public record ChangeRoleRequest(@NotNull(message = "Hãy chọn vai trò.") UserRole role) {}
