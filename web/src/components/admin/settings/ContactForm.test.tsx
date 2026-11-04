import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { ContactSettings } from "@/lib/admin/types";

const { adminFetch, requireReLogin } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { ContactForm } from "./ContactForm";

const empty: ContactSettings = { phone: null, zalo: null, messenger: null, address: null, mapUrl: null, hours: null };

const filled: ContactSettings = {
  phone: "0901 234 567",
  zalo: "0901234567",
  messenger: "https://m.me/nepnha",
  address: { vi: "Hà Nội", en: "Hanoi" },
  mapUrl: "https://maps.example.com/x",
  hours: { vi: "8h đến 17h", en: null },
};

function puts(): ContactSettings[] {
  return adminFetch.mock.calls.filter(([, init]) => init?.method === "PUT").map(([, init]) => init.body);
}

function serve(initial: ContactSettings) {
  adminFetch.mockImplementation(async (path: string, init?: { method?: string; body?: ContactSettings }) => {
    if (path !== "/admin/settings/contact") throw new Error(`unexpected ${path}`);
    return init?.method === "PUT" ? init.body : initial;
  });
}

const scrollIntoView = vi.fn();

beforeEach(() => {
  scrollIntoView.mockReset();
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  delete (Element.prototype as Partial<Element>).scrollIntoView;
});

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
});

describe("ContactForm", () => {
  it("loads the saved contact settings into the boxes", async () => {
    serve(filled);
    render(<ContactForm />);
    expect(await screen.findByLabelText("Điện thoại")).toHaveValue("0901 234 567");
    expect(screen.getByLabelText("Zalo (chỉ số)")).toHaveValue("0901234567");
    expect(screen.getByLabelText("Messenger (đường dẫn)")).toHaveValue("https://m.me/nepnha");
    expect(screen.getByLabelText("Đường dẫn bản đồ")).toHaveValue("https://maps.example.com/x");
    expect(within(screen.getByRole("group", { name: /Địa chỉ/ })).getByLabelText("English")).toHaveValue("Hanoi");
    expect(within(screen.getByRole("group", { name: /Giờ liên hệ/ })).getByLabelText("Tiếng Việt")).toHaveValue(
      "8h đến 17h",
    );
    expect(adminFetch).toHaveBeenCalledWith("/admin/settings/contact");
  });

  it("sends an empty box as null, not as an empty string", async () => {
    const user = userEvent.setup();
    serve(filled);
    render(<ContactForm />);
    for (const label of ["Điện thoại", "Zalo (chỉ số)", "Messenger (đường dẫn)", "Đường dẫn bản đồ"]) {
      await user.clear(await screen.findByLabelText(label));
    }
    for (const group of [/Địa chỉ/, /Giờ liên hệ/]) {
      for (const language of ["Tiếng Việt", "English"]) {
        await user.clear(within(screen.getByRole("group", { name: group })).getByLabelText(language));
      }
    }
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(puts()[0]).toEqual({
      phone: null,
      zalo: null,
      messenger: null,
      address: { vi: null, en: null },
      mapUrl: null,
      hours: { vi: null, en: null },
    });
  });

  it("trims every box before it sends", async () => {
    const user = userEvent.setup();
    serve(empty);
    render(<ContactForm />);
    await user.type(await screen.findByLabelText("Điện thoại"), "  0901 234 567  ");
    await user.type(within(screen.getByRole("group", { name: /Địa chỉ/ })).getByLabelText("Tiếng Việt"), "  Hà Nội ");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(puts()[0]).toMatchObject({ phone: "0901 234 567", address: { vi: "Hà Nội", en: null }, zalo: null });
  });

  it("shows the API text when Zalo is not a number, and keeps what was typed", async () => {
    const user = userEvent.setup();
    serve(empty);
    render(<ContactForm />);
    await user.type(await screen.findByLabelText("Zalo (chỉ số)"), "abc");
    adminFetch.mockImplementation(async (_path: string, init?: { method?: string }) => {
      if (init?.method === "PUT") throw new AdminApiError(400, "Số Zalo chỉ gồm chữ số, dấu cách, dấu +, dấu chấm và dấu gạch ngang, tối đa 30 ký tự.");
      return empty;
    });
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    const zalo = screen.getByLabelText("Zalo (chỉ số)");
    // The message is under the Zalo box, not at the end of the page, and the screen moves there.
    await waitFor(() => expect(zalo).toHaveFocus());
    expect(zalo).toHaveAttribute("aria-invalid", "true");
    expect(zalo).toHaveAccessibleDescription(/^Số Zalo chỉ gồm chữ số/);
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(zalo);
    expect(screen.getByRole("alert")).toHaveTextContent("Chưa lưu. Hãy sửa ô có viền đỏ.");
    expect(puts()).toHaveLength(1);
    expect(puts()[0].zalo).toBe("abc");
    expect(screen.getByLabelText("Zalo (chỉ số)")).toHaveValue("abc");
  });

  it("puts a length error of the address under the box that is too long", async () => {
    const user = userEvent.setup();
    serve(empty);
    render(<ContactForm />);
    const addressEn = within(await screen.findByRole("group", { name: /Địa chỉ/ })).getByLabelText("English");
    fireEvent.change(addressEn, { target: { value: "x".repeat(501) } });
    adminFetch.mockImplementation(async (_path: string, init?: { method?: string }) => {
      if (init?.method === "PUT") throw new AdminApiError(400, "Địa chỉ dài tối đa 500 ký tự.");
      return empty;
    });
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(addressEn).toHaveFocus());
    expect(addressEn).toHaveAccessibleDescription("Địa chỉ dài tối đa 500 ký tự.");
  });

  it("keeps Lưu off until something changed, and Bỏ thay đổi brings the saved values back after a yes", async () => {
    const user = userEvent.setup();
    serve(filled);
    render(<ContactForm />);
    const save = await screen.findByRole("button", { name: "Lưu" });
    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText("Điện thoại"), "9");
    expect(save).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Bỏ thay đổi" }));
    const question = screen.getByRole("alertdialog", { name: "Bỏ thay đổi chưa lưu?" });
    await user.click(within(question).getByRole("button", { name: "Bỏ thay đổi" }));
    expect(screen.getByLabelText("Điện thoại")).toHaveValue("0901 234 567");
    expect(save).toBeDisabled();
  });

  it("is clean again after a save, using the values the API answered", async () => {
    const user = userEvent.setup();
    serve(empty);
    render(<ContactForm />);
    await user.type(await screen.findByLabelText("Điện thoại"), " 0901 ");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    await waitFor(() => expect(screen.getByLabelText("Điện thoại")).toHaveValue("0901"));
    expect(screen.getByRole("button", { name: "Lưu" })).toBeDisabled();
  });

  it("keeps what the user typed while the save was running, and stays unsaved", async () => {
    const user = userEvent.setup();
    let finish: (value: ContactSettings) => void = () => {};
    adminFetch.mockImplementation(async (_path: string, init?: { method?: string; body?: ContactSettings }) => {
      if (init?.method !== "PUT") return empty;
      return new Promise<ContactSettings>((resolve) => (finish = resolve));
    });
    render(<ContactForm />);
    const phone = await screen.findByLabelText("Điện thoại");
    await user.type(phone, "09");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    await user.type(phone, "01");
    finish({ ...empty, phone: "09" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Lưu" })).toBeEnabled());
    expect(phone).toHaveValue("0901");
  });

  it("asks the browser to confirm leaving while there are unsaved changes, and not otherwise", async () => {
    const user = userEvent.setup();
    serve(empty);
    render(<ContactForm />);
    await screen.findByLabelText("Điện thoại");
    expect(fireEvent(window, new Event("beforeunload", { cancelable: true }))).toBe(true);
    await user.type(screen.getByLabelText("Điện thoại"), "1");
    expect(fireEvent(window, new Event("beforeunload", { cancelable: true }))).toBe(false);
  });

  it("signs in again after a session-expired answer and saves once", async () => {
    const user = userEvent.setup();
    requireReLogin.mockResolvedValue(undefined);
    let attempts = 0;
    adminFetch.mockImplementation(async (_path: string, init?: { method?: string; body?: ContactSettings }) => {
      if (init?.method !== "PUT") return empty;
      attempts += 1;
      if (attempts === 1) throw new AdminApiError(401, "Phiên đã hết hạn.", "session-expired");
      return init.body;
    });
    render(<ContactForm />);
    await user.type(await screen.findByLabelText("Điện thoại"), "0901");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(attempts).toBe(2));
    expect(requireReLogin).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole("button", { name: "Lưu" })).toBeDisabled());
  });

  it("shows the API text and a retry button when loading fails", async () => {
    const user = userEvent.setup();
    adminFetch.mockRejectedValueOnce(new AdminApiError(503, "Máy chủ đang bận."));
    adminFetch.mockResolvedValue(empty);
    render(<ContactForm />);
    expect(await screen.findByText("Máy chủ đang bận.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByLabelText("Điện thoại")).toBeInTheDocument();
  });
});
