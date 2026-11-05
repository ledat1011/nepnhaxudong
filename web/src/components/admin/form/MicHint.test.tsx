import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MIC_HINT_KEY, MicHint, resetMicHintForTest } from "./MicHint";

const TEXT = /micro trên bàn phím/;

function touchScreen(touch: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: touch && query === "(pointer: coarse)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

beforeEach(() => {
  window.localStorage.clear();
  resetMicHintForTest();
  touchScreen(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MicHint", () => {
  it("tells a phone user that the keyboard's microphone can type for them", () => {
    render(<MicHint />);
    expect(screen.getByText(TEXT)).toBeInTheDocument();
  });

  it("is not shown on a computer, which has no keyboard microphone", () => {
    touchScreen(false);
    render(<MicHint />);
    expect(screen.queryByText(TEXT)).not.toBeInTheDocument();
  });

  it("shows once on a screen with several long boxes, at the first one", () => {
    render(
      <>
        <div data-testid="first">
          <MicHint />
        </div>
        <div data-testid="second">
          <MicHint />
        </div>
      </>,
    );
    expect(screen.getAllByText(TEXT)).toHaveLength(1);
    expect(screen.getByTestId("first")).toHaveTextContent(TEXT);
  });

  it("goes away for good after Đã hiểu, also on the next visit", async () => {
    const { unmount } = render(<MicHint />);
    await userEvent.click(screen.getByRole("button", { name: "Đã hiểu" }));
    expect(screen.queryByText(TEXT)).not.toBeInTheDocument();
    expect(window.localStorage.getItem(MIC_HINT_KEY)).toBe("da-hieu");
    unmount();
    resetMicHintForTest();
    render(<MicHint />);
    expect(screen.queryByText(TEXT)).not.toBeInTheDocument();
  });

  it("still works when the browser refuses storage (private mode)", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<MicHint />);
    await userEvent.click(screen.getByRole("button", { name: "Đã hiểu" }));
    expect(screen.queryByText(TEXT)).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("moves to the next long box when the first one goes away", () => {
    const { rerender } = render(
      <>
        <MicHint key="a" />
        <MicHint key="b" />
      </>,
    );
    expect(screen.getAllByText(TEXT)).toHaveLength(1);
    act(() => rerender(<MicHint key="b" />));
    expect(screen.getAllByText(TEXT)).toHaveLength(1);
  });
});
