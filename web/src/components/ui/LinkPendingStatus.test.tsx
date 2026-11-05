import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LinkPendingStatus, PENDING_NOTE_DELAY_MS } from "./LinkPendingStatus";
import { isNavigationPending } from "./navigation-pending";
import { NavigationStatus } from "./NavigationStatus";

const linkStatus = vi.hoisted(() => ({ pending: false }));

vi.mock("next/link", () => ({
  useLinkStatus: () => linkStatus,
}));

const LABEL = "Đang tải trang…";

/** A page: some links with a loading note, and the one shared status region of the layout. */
function Page({ links = 1 }: { links?: number }) {
  return (
    <>
      {Array.from({ length: links }, (_, i) => (
        <a key={i} href={`https://example.com/${i}`}>
          Xem tất cả câu chuyện
          <LinkPendingStatus label={LABEL} />
        </a>
      ))}
      <NavigationStatus />
    </>
  );
}

function expectHidden() {
  const status = screen.getByRole("status");
  expect(status).toHaveTextContent("");
  expect(status).toHaveClass("sr-only");
}

describe("LinkPendingStatus with the shared NavigationStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    linkStatus.pending = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("has one status region for the whole page, not one per link", () => {
    render(<Page links={15} />);
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("keeps the shared region empty and hidden while no link waits", () => {
    render(<Page />);
    expectHidden();
  });

  it("does not show the label at once, so a fast navigation shows nothing", () => {
    linkStatus.pending = true;
    render(<Page />);
    expectHidden();
    act(() => vi.advanceTimersByTime(PENDING_NOTE_DELAY_MS - 1));
    expectHidden();
  });

  it("shows the label in a fixed box when the next page takes longer than the delay", () => {
    linkStatus.pending = true;
    render(<Page />);
    act(() => vi.advanceTimersByTime(PENDING_NOTE_DELAY_MS));
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(LABEL);
    expect(status).toHaveClass("fixed");
    expect(status).not.toHaveClass("sr-only");
  });

  it("never shows the label when the wait ends before the delay", () => {
    linkStatus.pending = true;
    const { rerender } = render(<Page />);
    act(() => vi.advanceTimersByTime(PENDING_NOTE_DELAY_MS / 2));
    linkStatus.pending = false;
    rerender(<Page />);
    act(() => vi.advanceTimersByTime(PENDING_NOTE_DELAY_MS));
    expectHidden();
  });

  it("hides the label again when the wait ends", () => {
    linkStatus.pending = true;
    const { rerender } = render(<Page />);
    act(() => vi.advanceTimersByTime(PENDING_NOTE_DELAY_MS));
    expect(screen.getByRole("status")).toHaveTextContent(LABEL);
    linkStatus.pending = false;
    rerender(<Page />);
    expectHidden();
  });

  it("adds nothing to the link, so its name and layout never change", () => {
    linkStatus.pending = true;
    const { container } = render(<Page />);
    act(() => vi.advanceTimersByTime(PENDING_NOTE_DELAY_MS));
    const link = container.querySelector("a") as HTMLElement;
    expect(link).toHaveTextContent(/^Xem tất cả câu chuyện$/);
    expect(link.children).toHaveLength(0);
  });

  it("tells the top loading bar only after the same delay, and until the wait ends", () => {
    linkStatus.pending = true;
    const { rerender } = render(<Page />);
    act(() => vi.advanceTimersByTime(PENDING_NOTE_DELAY_MS - 1));
    expect(isNavigationPending()).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(isNavigationPending()).toBe(true);
    linkStatus.pending = false;
    rerender(<Page />);
    expect(isNavigationPending()).toBe(false);
  });

  it("stops telling the loading bar when the link goes away", () => {
    linkStatus.pending = true;
    const { unmount } = render(<LinkPendingStatus label={LABEL} />);
    act(() => vi.advanceTimersByTime(PENDING_NOTE_DELAY_MS));
    unmount();
    expect(isNavigationPending()).toBe(false);
  });

  it("has no animation class, so reduced motion has nothing to stop", () => {
    linkStatus.pending = true;
    render(<Page />);
    act(() => vi.advanceTimersByTime(PENDING_NOTE_DELAY_MS));
    expect(screen.getByRole("status").className).not.toMatch(/animate-|transition/);
  });
});
