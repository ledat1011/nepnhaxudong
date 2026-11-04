import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserResponse } from "@/lib/admin/types";

const { adminFetch, replace, refresh, search } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  search: { value: "" },
}));

vi.mock("@/lib/admin/api", () => ({ adminFetch }));
vi.mock("@/lib/admin/csrf", () => ({ resetCsrfToken: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ refresh }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search.value),
}));

import { LoginScreen } from "./LoginScreen";

const user: UserResponse = { id: 1, email: "an@example.com", displayName: "An", mustChangePassword: false };

async function signIn(result: UserResponse = user) {
  adminFetch.mockResolvedValueOnce(result);
  const events = userEvent.setup();
  render(<LoginScreen />);
  await events.type(screen.getByLabelText("Email"), "an@example.com");
  await events.type(screen.getByLabelText("Mật khẩu"), "secret-password");
  await events.click(screen.getByRole("button", { name: "Đăng nhập" }));
  await waitFor(() => expect(replace).toHaveBeenCalled());
}

beforeEach(() => {
  adminFetch.mockReset();
  replace.mockReset();
  refresh.mockReset();
  refresh.mockResolvedValue(undefined);
  search.value = "";
});

describe("LoginScreen", () => {
  it("goes to the dashboard after sign-in when there is no next", async () => {
    await signIn();
    expect(refresh).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/admin");
  });

  it("goes to the next path when it is inside /admin", async () => {
    search.value = "next=%2Fadmin%2Fanh";
    await signIn();
    expect(replace).toHaveBeenCalledWith("/admin/anh");
  });

  it.each([["https%3A%2F%2Fevil.example"], ["%2F%2Fevil.example"], ["%2Fadmin%40evil"]])(
    "ignores the unsafe next %s",
    async (next) => {
      search.value = `next=${next}`;
      await signIn();
      expect(replace).toHaveBeenCalledWith("/admin");
    },
  );

  it("goes to the change-password page when the password is temporary", async () => {
    search.value = "next=%2Fadmin%2Fanh";
    await signIn({ ...user, mustChangePassword: true });
    expect(replace).toHaveBeenCalledWith("/admin/doi-mat-khau");
  });
});
