import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LinkPendingStatus } from "./LinkPendingStatus";

const linkStatus = vi.hoisted(() => ({ pending: false }));

vi.mock("next/link", () => ({
  useLinkStatus: () => linkStatus,
}));

const LABEL = "Đang tải trang…";

describe("LinkPendingStatus", () => {
  beforeEach(() => {
    linkStatus.pending = false;
  });

  it("keeps an empty, hidden status region while the link is not waiting", () => {
    render(<LinkPendingStatus label={LABEL} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("");
    expect(status).toHaveClass("sr-only");
  });

  it("shows the label in a fixed box while the next page loads", () => {
    linkStatus.pending = true;
    render(<LinkPendingStatus label={LABEL} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(LABEL);
    expect(status).toHaveClass("fixed");
    expect(status).not.toHaveClass("sr-only");
  });

  it("renders outside the link, in the body, so it never changes the link's name or layout", () => {
    linkStatus.pending = true;
    const { container } = render(
      <a href="https://example.com/link">
        Xem tất cả
        <LinkPendingStatus label={LABEL} />
      </a>,
    );
    expect(container.querySelector("a")).toHaveTextContent(/^Xem tất cả$/);
    expect(screen.getByRole("status").parentElement).toBe(document.body);
  });

  it("has no animation class, so reduced motion has nothing to stop", () => {
    linkStatus.pending = true;
    render(<LinkPendingStatus label={LABEL} />);
    expect(screen.getByRole("status").className).not.toMatch(/animate-|transition/);
  });
});
