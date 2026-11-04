import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/anh" }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ signOut: vi.fn() }) }));

import { BottomNav } from "@/components/admin/shell/BottomNav";
import { NavGuardProvider } from "./nav-guard";
import { useUnsavedChanges } from "./use-unsaved-changes";

const QUESTION = "Bạn có thay đổi chưa lưu. Rời trang?";

function Form({ dirty }: { dirty: boolean }) {
  useUnsavedChanges(dirty);
  return <Link href="/admin/san-pham">Sản phẩm trong trang</Link>;
}

function Page({ dirty }: { dirty: boolean }) {
  return (
    <NavGuardProvider>
      <Form dirty={dirty} />
      <BottomNav />
    </NavGuardProvider>
  );
}

function beforeUnload(): Event {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

describe("useUnsavedChanges", () => {
  it("asks before a bottom-nav link when the form is dirty, and stays on Cancel", async () => {
    const events = userEvent.setup();
    render(<Page dirty />);
    const reached = vi.fn();
    screen.getByRole("navigation", { name: "Menu chính" }).addEventListener("click", reached);
    const before = window.location.href;

    await events.click(screen.getByRole("link", { name: "Câu chuyện" }));
    expect(await screen.findByText(QUESTION)).toBeInTheDocument();
    expect(reached).not.toHaveBeenCalled();

    await events.click(screen.getByRole("button", { name: "Ở lại" }));
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
    expect(window.location.href).toBe(before);
    expect(reached).not.toHaveBeenCalled();
  });

  it("lets the click through after the user confirms", async () => {
    const events = userEvent.setup();
    render(<Page dirty />);
    const reached = vi.fn((event: Event) => event.preventDefault());
    screen.getByRole("navigation", { name: "Menu chính" }).addEventListener("click", reached);
    await events.click(screen.getByRole("link", { name: "Câu chuyện" }));
    await events.click(await screen.findByRole("button", { name: "Rời trang" }));
    expect(reached).toHaveBeenCalledTimes(1);
  });

  it("also guards any other link inside /admin", async () => {
    const events = userEvent.setup();
    render(<Page dirty />);
    await events.click(screen.getByRole("link", { name: "Sản phẩm trong trang" }));
    expect(await screen.findByText(QUESTION)).toBeInTheDocument();
  });

  it("does not ask when the form is clean", async () => {
    const events = userEvent.setup();
    render(<Page dirty={false} />);
    const reached = vi.fn((event: Event) => event.preventDefault());
    screen.getByRole("navigation", { name: "Menu chính" }).addEventListener("click", reached);
    await events.click(screen.getByRole("link", { name: "Câu chuyện" }));
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
    expect(reached).toHaveBeenCalledTimes(1);
  });

  it("adds beforeunload only while dirty", () => {
    const { rerender } = render(<Page dirty={false} />);
    expect(beforeUnload().defaultPrevented).toBe(false);
    rerender(<Page dirty />);
    expect(beforeUnload().defaultPrevented).toBe(true);
    rerender(<Page dirty={false} />);
    expect(beforeUnload().defaultPrevented).toBe(false);
  });
});

describe("nav guard scope", () => {
  /** Renders a dirty form with extra links, and counts the clicks that reach the page (not stopped by the guard). */
  function setupLinks() {
    const reached = vi.fn((event: Event) => event.preventDefault());
    const view = render(
      <NavGuardProvider>
        <Form dirty />
        <div onClick={(event) => reached(event.nativeEvent)}>
          <Link href="/vi/san-pham">Trang công khai</Link>
          <Link href="/admin/san-pham" target="_blank">Tab mới</Link>
          <Link href="/admin/san-pham" download>Tải về</Link>
          <a href="https://example.com/x">Ngoài</a>
          <a href="#phan-2">Neo</a>
        </div>
      </NavGuardProvider>,
    );
    return { reached, ...view };
  }

  it("guards a link to a public page of this site", async () => {
    const { reached } = setupLinks();
    await userEvent.setup().click(screen.getByRole("link", { name: "Trang công khai" }));
    expect(await screen.findByText(QUESTION)).toBeInTheDocument();
    expect(reached).not.toHaveBeenCalled();
  });

  it.each([
    ["ctrl", { ctrlKey: true }],
    ["meta", { metaKey: true }],
    ["shift", { shiftKey: true }],
    ["alt", { altKey: true }],
    ["middle button", { button: 1 }],
  ])("lets a %s click through", (_name, init) => {
    const { reached } = setupLinks();
    fireEvent.click(screen.getByRole("link", { name: "Trang công khai" }), init);
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
    expect(reached).toHaveBeenCalledTimes(1);
  });

  it.each(["Tab mới", "Tải về", "Ngoài", "Neo"])("does not guard the link %s", (name) => {
    const { reached } = setupLinks();
    fireEvent.click(screen.getByRole("link", { name }));
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
    expect(reached).toHaveBeenCalledTimes(1);
  });

  it("removes its click listener on unmount", () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<NavGuardProvider>x</NavGuardProvider>);
    const added = add.mock.calls.find(([type]) => type === "click");
    expect(added).toBeDefined();
    unmount();
    expect(remove).toHaveBeenCalledWith("click", added![1], added![2]);
    add.mockRestore();
    remove.mockRestore();
  });
});
