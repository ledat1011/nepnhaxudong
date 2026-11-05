import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DraftRestoreDialog } from "./DraftRestoreDialog";

function renderDialog() {
  const onRestore = vi.fn();
  const onDiscard = vi.fn();
  const onLater = vi.fn();
  render(
    <DraftRestoreDialog savedAt={Date.UTC(2026, 10, 5, 3, 0)} stale={false} onRestore={onRestore} onDiscard={onDiscard} onLater={onLater} />,
  );
  return { onRestore, onDiscard, onLater };
}

describe("DraftRestoreDialog", () => {
  it("has Khôi phục as the chosen button, so Enter brings the text back", async () => {
    const { onRestore, onDiscard } = renderDialog();
    const restore = await screen.findByRole("button", { name: "Khôi phục" });
    expect(restore).toHaveFocus();
    await userEvent.setup().keyboard("{Enter}");
    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it("drops the draft only on Bỏ bản đó", async () => {
    const { onRestore, onDiscard } = renderDialog();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Bỏ bản đó" }));
    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onRestore).not.toHaveBeenCalled();
  });

  it("keeps the draft for later when closed with Escape", async () => {
    const { onRestore, onDiscard, onLater } = renderDialog();
    await screen.findByRole("alertdialog", { name: "Có bài đang viết dở" });
    await userEvent.setup().keyboard("{Escape}");
    expect(onLater).toHaveBeenCalledTimes(1);
    expect(onRestore).not.toHaveBeenCalled();
    expect(onDiscard).not.toHaveBeenCalled();
  });
});
