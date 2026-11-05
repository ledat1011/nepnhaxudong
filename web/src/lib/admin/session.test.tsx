import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { draftKey, writeDraft } from "./story-draft";
import { AdminApiError } from "./errors";
import type { UserResponse } from "./types";

const { adminFetch, replace, resetCsrfToken } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  replace: vi.fn(),
  resetCsrfToken: vi.fn(),
}));

vi.mock("./api", () => ({ adminFetch }));
vi.mock("./csrf", () => ({ resetCsrfToken }));
vi.mock("@/lib/admin/api", () => ({ adminFetch }));
vi.mock("@/lib/admin/csrf", () => ({ resetCsrfToken }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

import { AdminSessionProvider, useAdminSession } from "./session";

const user: UserResponse = {
  id: 1,
  email: "an@example.com",
  displayName: "An",
  mustChangePassword: false,
  role: "OWNER",
  totpEnabled: false,
  mustSetupTotp: false,
};

type Session = ReturnType<typeof useAdminSession>;
const latest = {} as { current: Session };

function Probe() {
  const current = useAdminSession();
  useEffect(() => {
    latest.current = current;
  });
  return <p data-testid="status">{current.status}</p>;
}

function renderProvider() {
  return render(
    <AdminSessionProvider>
      <Probe />
    </AdminSessionProvider>,
  );
}

function meReturns(result: UserResponse | AdminApiError) {
  adminFetch.mockImplementation((path: string) => {
    if (path === "/auth/me") return result instanceof AdminApiError ? Promise.reject(result) : Promise.resolve(result);
    return Promise.reject(new Error(`unexpected ${path}`));
  });
}

beforeEach(() => {
  adminFetch.mockReset();
  replace.mockReset();
  resetCsrfToken.mockReset();
});

describe("AdminSessionProvider status", () => {
  it("starts as loading and becomes ready for a signed-in user", async () => {
    meReturns(user);
    renderProvider();
    expect(screen.getByTestId("status")).toHaveTextContent("loading");
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("ready"));
    expect(latest.current.user).toEqual(user);
    expect(adminFetch).toHaveBeenCalledWith("/auth/me");
  });

  it("is must-change-password when the user has a temporary password", async () => {
    meReturns({ ...user, mustChangePassword: true });
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("must-change-password"));
  });

  it("is must-setup-totp when an owner switched off the two-factor login", async () => {
    meReturns({ ...user, mustSetupTotp: true });
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("must-setup-totp"));
  });

  it("asks for the password change before the two-factor setup", async () => {
    meReturns({ ...user, mustChangePassword: true, mustSetupTotp: true });
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("must-change-password"));
  });

  it("is signed-out on 401", async () => {
    meReturns(new AdminApiError(401, "Chưa đăng nhập.", "session-expired"));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("signed-out"));
    expect(latest.current.user).toBeNull();
  });

  it("refresh reads /auth/me again", async () => {
    meReturns(user);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("ready"));
    meReturns({ ...user, mustChangePassword: true });
    await act(() => latest.current.refresh());
    expect(screen.getByTestId("status")).toHaveTextContent("must-change-password");
  });
});

describe("failures of /auth/me that are not a 401", () => {
  it.each([
    ["a network error", new AdminApiError(0, "Không kết nối được máy chủ.")],
    ["a 5xx", new AdminApiError(503, "Máy chủ bận.")],
  ])("is error, not signed-out, on %s at load", async (_name, failure) => {
    meReturns(failure);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("error"));
    expect(latest.current.user).toBeNull();
  });

  it("is error when a refresh fails right after a login, and recovers on the next refresh", async () => {
    meReturns(new AdminApiError(401, "Chưa đăng nhập.", "session-expired"));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("signed-out"));
    meReturns(new AdminApiError(0, "Không kết nối được máy chủ."));
    await act(() => latest.current.refresh());
    expect(screen.getByTestId("status")).toHaveTextContent("error");
    meReturns(user);
    await act(() => latest.current.refresh());
    expect(screen.getByTestId("status")).toHaveTextContent("ready");
  });
});

describe("signOut", () => {
  it("marks the sign-out as deliberate", async () => {
    meReturns(user);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("ready"));
    expect(latest.current.signedOutOnPurpose).toBe(false);
    adminFetch.mockResolvedValue(undefined);
    await act(() => latest.current.signOut());
    expect(latest.current.signedOutOnPurpose).toBe(true);
  });

  it("calls logout, forgets the CSRF token and goes to the login page", async () => {
    meReturns(user);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("ready"));
    adminFetch.mockResolvedValue(undefined);
    await act(() => latest.current.signOut());
    expect(adminFetch).toHaveBeenCalledWith("/auth/logout", { method: "POST" });
    expect(resetCsrfToken).toHaveBeenCalled();
    expect(screen.getByTestId("status")).toHaveTextContent("signed-out");
    expect(replace).toHaveBeenCalledWith("/admin/dang-nhap");
  });

  it("removes the story drafts kept in the browser, also when logout fails, and allows them again after a sign-in", async () => {
    meReturns(user);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("ready"));
    localStorage.setItem(draftKey(1, 5), "{}");
    localStorage.setItem(draftKey(1, undefined), "{}");
    adminFetch.mockRejectedValue(new AdminApiError(503, "Bận."));
    await act(() => latest.current.signOut());
    expect(localStorage.getItem(draftKey(1, 5))).toBeNull();
    expect(localStorage.getItem(draftKey(1, undefined))).toBeNull();
    const draft = { version: 1 as const, userId: user.id, savedAt: 1, base: {}, state: {} };
    expect(writeDraft(draftKey(1, 5), draft)).toBe("blocked");

    meReturns(user);
    await act(() => latest.current.refresh());
    expect(screen.getByTestId("status")).toHaveTextContent("ready");
    expect(writeDraft(draftKey(1, 5), draft)).toBe("written");
    localStorage.clear();
  });

  it("still clears the local state when logout fails", async () => {
    meReturns(user);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("ready"));
    adminFetch.mockRejectedValue(new AdminApiError(401, "Hết phiên.", "session-expired"));
    await act(() => latest.current.signOut());
    expect(resetCsrfToken).toHaveBeenCalled();
    expect(screen.getByTestId("status")).toHaveTextContent("signed-out");
    expect(latest.current.user).toBeNull();
    expect(replace).toHaveBeenCalledWith("/admin/dang-nhap");
  });
});

describe("requireReLogin", () => {
  async function renderReady() {
    meReturns(user);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("ready"));
    adminFetch.mockImplementation((path: string) =>
      path === "/auth/login" ? Promise.resolve(user) : Promise.reject(new Error(`unexpected ${path}`)),
    );
  }

  it("opens the dialog and resolves after a successful sign-in", async () => {
    await renderReady();
    const events = userEvent.setup();
    let promise!: Promise<void>;
    act(() => {
      promise = latest.current.requireReLogin();
    });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await events.type(screen.getByLabelText("Mật khẩu"), "secret-password");
    await events.click(screen.getByRole("button", { name: "Đăng nhập" }));
    await expect(promise).resolves.toBeUndefined();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByTestId("status")).toHaveTextContent("ready");
  });

  it("rejects with a 401 AdminApiError when the user cancels", async () => {
    await renderReady();
    const events = userEvent.setup();
    let promise!: Promise<void>;
    act(() => {
      promise = latest.current.requireReLogin();
    });
    const settled = promise.catch((e: unknown) => e);
    await screen.findByRole("dialog");
    await events.click(screen.getByRole("button", { name: "Hủy" }));
    const error = await settled;
    expect(error).toBeInstanceOf(AdminApiError);
    expect(error).toMatchObject({ status: 401 });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("opens one dialog for two concurrent callers and resolves both", async () => {
    await renderReady();
    const events = userEvent.setup();
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = latest.current.requireReLogin();
      second = latest.current.requireReLogin();
    });
    expect(first).toBe(second);
    expect(await screen.findAllByRole("dialog")).toHaveLength(1);
    await events.type(screen.getByLabelText("Mật khẩu"), "secret-password");
    await events.click(screen.getByRole("button", { name: "Đăng nhập" }));
    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
  });

  it("can open the dialog again after it was closed", async () => {
    await renderReady();
    const events = userEvent.setup();
    let promise!: Promise<void>;
    act(() => {
      promise = latest.current.requireReLogin();
    });
    const settled = promise.catch(() => undefined);
    await events.click(await screen.findByRole("button", { name: "Hủy" }));
    await settled;
    act(() => {
      promise = latest.current.requireReLogin();
    });
    promise.catch(() => undefined);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("rejects when another account signs in, keeps the old user and ends the foreign session", async () => {
    await renderReady();
    adminFetch.mockImplementation((path: string) =>
      path === "/auth/login"
        ? Promise.resolve({ ...user, id: 2, email: "binh@example.com" })
        : Promise.resolve(undefined),
    );
    const events = userEvent.setup();
    let promise!: Promise<void>;
    act(() => {
      promise = latest.current.requireReLogin();
    });
    const settled = promise.catch((e: unknown) => e);
    await events.type(await screen.findByLabelText("Mật khẩu"), "secret-password");
    await events.click(screen.getByRole("button", { name: "Đăng nhập" }));
    const error = await settled;
    expect(error).toBeInstanceOf(AdminApiError);
    expect(error).toMatchObject({ status: 401, detail: "Hãy đăng nhập bằng đúng tài khoản đang dùng." });
    expect(latest.current.user?.id).toBe(1);
    expect(adminFetch).toHaveBeenCalledWith("/auth/logout", { method: "POST" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("locks the email field to the current user", async () => {
    await renderReady();
    act(() => {
      latest.current.requireReLogin().catch(() => undefined);
    });
    const email = await screen.findByLabelText("Email");
    expect(email).toHaveValue("an@example.com");
    expect(email).toHaveAttribute("readonly");
  });

  it("rejects, without changing the session or the page, when the user must change the password", async () => {
    await renderReady();
    adminFetch.mockImplementation((path: string) =>
      path === "/auth/login" ? Promise.resolve({ ...user, mustChangePassword: true }) : Promise.resolve(undefined),
    );
    const events = userEvent.setup();
    let promise!: Promise<void>;
    act(() => {
      promise = latest.current.requireReLogin();
    });
    const settled = promise.catch((e: unknown) => e);
    await events.type(await screen.findByLabelText("Mật khẩu"), "secret-password");
    await events.click(screen.getByRole("button", { name: "Đăng nhập" }));
    const error = await settled;
    expect(error).toMatchObject({
      status: 401,
      detail: "Bạn cần đổi mật khẩu trước. Hãy lưu nội dung ra chỗ khác rồi tải lại trang.",
    });
    expect(screen.getByTestId("status")).toHaveTextContent("ready");
    expect(replace).not.toHaveBeenCalled();
  });

  it("rejects, without changing the session or the page, when the user must set up two-factor login again", async () => {
    await renderReady();
    adminFetch.mockImplementation((path: string) =>
      path === "/auth/login" ? Promise.resolve({ ...user, mustSetupTotp: true }) : Promise.resolve(undefined),
    );
    const events = userEvent.setup();
    let promise!: Promise<void>;
    act(() => {
      promise = latest.current.requireReLogin();
    });
    const settled = promise.catch((e: unknown) => e);
    await events.type(await screen.findByLabelText("Mật khẩu"), "secret-password");
    await events.click(screen.getByRole("button", { name: "Đăng nhập" }));
    const error = await settled;
    expect(error).toMatchObject({
      status: 401,
      detail: "Bạn cần bật lại xác thực 2 lớp trước. Hãy lưu nội dung ra chỗ khác rồi tải lại trang.",
    });
    expect(screen.getByTestId("status")).toHaveTextContent("ready");
    expect(replace).not.toHaveBeenCalled();
  });
});
