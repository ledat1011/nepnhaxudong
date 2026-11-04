import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LinkPendingStatus, PENDING_NOTE_DELAY_MS } from "./LinkPendingStatus";

const linkStatus = vi.hoisted(() => ({ pending: false }));

vi.mock("next/link", () => ({
  useLinkStatus: () => linkStatus,
}));

const LABEL = "Đang tải trang…";

function expectHidden() {
  const status = screen.getByRole("status");
  expect(status).toHaveTextContent("");
  expect(status).toHaveClass("sr-only");
}

describe("LinkPendingStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    linkStatus.pending = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps an empty, hidden status region while the link is not waiting", () => {
    render(<LinkPendingStatus label={LABEL} />);
    expectHidden();
  });

  it("does not show the label at once, so a fast navigation shows nothing", () => {
    linkStatus.pending = true;
    render(<LinkPendingStatus label={LABEL} />);
    expectHidden();
    act(() => vi.advanceTimersByTime(PENDING_NOTE_DELAY_MS - 1));
    expectHidden();
  });

  it("shows the label in a fixed box when the next page takes longer than the delay", () => {
    linkStatus.pending = true;
    render(<LinkPendingStatus label={LABEL} />);
    act(() => vi.advanceTimersByTime(PENDING_NOTE_DELAY_MS));
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(LABEL);
    expect(status).toHaveClass("fixed");
    expect(status).not.toHaveClass("sr-only");
  });

  it("never shows the label when the wait ends before the delay", () => {
    linkStatus.pending = true;
    const { rerender } = render(<LinkPendingStatus label={LABEL} />);
    act(() => vi.advanceTimersByTime(PENDING_NOTE_DELAY_MS / 2));
    linkStatus.pending = false;
    rerender(<LinkPendingStatus label={LABEL} />);
    act(() => vi.advanceTimersByTime(PENDING_NOTE_DELAY_MS));
    expectHidden();
  });

  it("hides the label again when the wait ends", () => {
    linkStatus.pending = true;
    const { rerender } = render(<LinkPendingStatus label={LABEL} />);
    act(() => vi.advanceTimersByTime(PENDING_NOTE_DELAY_MS));
    expect(screen.getByRole("status")).toHaveTextContent(LABEL);
    linkStatus.pending = false;
    rerender(<LinkPendingStatus label={LABEL} />);
    expectHidden();
  });

  it("renders outside the link, in the body, so it never changes the link's name or layout", () => {
    linkStatus.pending = true;
    const { container } = render(
      <a href="https://example.com/link">
        Xem tất cả
        <LinkPendingStatus label={LABEL} />
      </a>,
    );
    act(() => vi.advanceTimersByTime(PENDING_NOTE_DELAY_MS));
    expect(container.querySelector("a")).toHaveTextContent(/^Xem tất cả$/);
    expect(screen.getByRole("status").parentElement).toBe(document.body);
  });

  it("has no animation class, so reduced motion has nothing to stop", () => {
    linkStatus.pending = true;
    render(<LinkPendingStatus label={LABEL} />);
    act(() => vi.advanceTimersByTime(PENDING_NOTE_DELAY_MS));
    expect(screen.getByRole("status").className).not.toMatch(/animate-|transition/);
  });
});
