import { act, render, screen, waitFor } from "@testing-library/react";
import { useContext, useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { adminFetch, pathname } = vi.hoisted(() => ({ adminFetch: vi.fn(), pathname: { value: "/admin/anh" } }));
vi.mock("@/lib/admin/api", () => ({ adminFetch }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

import { TodoBadge, TodoCountContext, TodoCountProvider, useTodoCount } from "./todo-count";

function Count() {
  return <p>đếm: {String(useTodoCount())}</p>;
}

/** What the dashboard's to-do list does once it has counted. */
function Publisher({ count }: { count: number }) {
  const context = useContext(TodoCountContext);
  useEffect(() => context?.publish(count), [context, count]);
  return null;
}

beforeEach(() => {
  adminFetch.mockReset();
  pathname.value = "/admin/anh";
});

/** Contact and brand complete, one draft story with a cover: one job. */
function oneJob(path: string) {
  if (path === "/admin/settings/contact") {
    return Promise.resolve({
      phone: "1",
      zalo: "1",
      messenger: null,
      address: { vi: "a", en: "a" },
      mapUrl: null,
      hours: { vi: "h", en: "h" },
    });
  }
  if (path === "/admin/settings/brand") return Promise.resolve({ tagline: { vi: "t", en: "t" } });
  if (path === "/admin/stories") {
    const text = { vi: "x", en: "x" };
    return Promise.resolve([
      { id: 1, status: "DRAFT", publishedAt: null, coverMediaId: 2, slug: text, title: text, excerpt: text, bodyHtml: text, missingEn: false },
    ]);
  }
  return Promise.resolve([]);
}

describe("TodoCountProvider", () => {
  it("counts the jobs of the to-do list when the admin opens on another screen", async () => {
    adminFetch.mockImplementation(oneJob);
    render(
      <TodoCountProvider>
        <Count />
      </TodoCountProvider>,
    );
    expect(await screen.findByText("đếm: 1")).toBeInTheDocument();
    expect(adminFetch).toHaveBeenCalledTimes(6);
  });

  it("leaves the count to the to-do list on Tổng quan, which loads the same lists", async () => {
    pathname.value = "/admin";
    render(
      <TodoCountProvider>
        <Count />
        <Publisher count={3} />
      </TodoCountProvider>,
    );
    expect(await screen.findByText("đếm: 3")).toBeInTheDocument();
    expect(adminFetch).not.toHaveBeenCalled();
  });

  it("shows nothing when the lists cannot be read", async () => {
    adminFetch.mockRejectedValue(new Error("mạng"));
    render(
      <TodoCountProvider>
        <Count />
      </TodoCountProvider>,
    );
    await waitFor(() => expect(adminFetch).toHaveBeenCalledTimes(6));
    await act(async () => {});
    expect(screen.getByText("đếm: null")).toBeInTheDocument();
  });

  it("is null without a provider (a screen tested on its own)", () => {
    render(<Count />);
    expect(screen.getByText("đếm: null")).toBeInTheDocument();
  });
});

describe("TodoBadge", () => {
  it("shows the number, and 99+ above 99", () => {
    const { rerender } = render(<TodoBadge count={4} />);
    expect(screen.getByText("4")).toBeInTheDocument();
    rerender(<TodoBadge count={150} />);
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("shows nothing when there is nothing to do or the count is unknown", () => {
    const { container, rerender } = render(<TodoBadge count={0} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<TodoBadge count={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
