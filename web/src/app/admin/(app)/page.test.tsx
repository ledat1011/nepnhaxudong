import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/api", () => ({ adminFetch: vi.fn(() => new Promise(() => {})) }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin: vi.fn() }) }));

import AdminHomePage from "./page";

describe("Tổng quan page", () => {
  it("puts the shortcut tiles first, so the to-do list that loads below cannot move them under a finger", () => {
    render(<AdminHomePage />);
    const firstTile = screen.getByRole("link", { name: "Viết câu chuyện" });
    const todo = screen.getByRole("heading", { name: /^Việc cần làm/ });
    expect(firstTile.compareDocumentPosition(todo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
