import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "./alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "./dialog";
import { Input } from "./input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./sheet";
import { Textarea } from "./textarea";

const ADMIN_DIR = path.resolve(__dirname, "..");

/** Every .tsx file of the admin components, tests left out. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) return sourceFiles(full);
    return item.name.endsWith(".tsx") && !item.name.includes(".test.") ? [full] : [];
  });
}

describe("text boxes", () => {
  it("keep 16 px text at every width, so a phone does not zoom and a laptop is as easy to read", () => {
    render(
      <>
        <Input aria-label="một dòng" />
        <Textarea aria-label="nhiều dòng" />
      </>,
    );
    for (const box of [screen.getByLabelText("một dòng"), screen.getByLabelText("nhiều dòng")]) {
      expect(box).toHaveClass("text-base");
      expect(box.className).not.toMatch(/(^|\s)(sm|md|lg|xl|2xl):text-/);
    }
  });

  it("do not capitalise or correct an address, an email or a phone number", () => {
    render(
      <>
        <Input aria-label="url" inputMode="url" />
        <Input aria-label="email" type="email" />
        <Input aria-label="tel" inputMode="tel" />
        <Input aria-label="tên" />
      </>,
    );
    for (const name of ["url", "email", "tel"]) {
      const box = screen.getByLabelText(name);
      expect(box).toHaveAttribute("autocapitalize", "none");
      expect(box).toHaveAttribute("autocorrect", "off");
      expect(box).toHaveAttribute("spellcheck", "false");
    }
    // An ordinary text box keeps the phone's help (a capital letter at the start of a name).
    expect(screen.getByLabelText("tên")).not.toHaveAttribute("autocapitalize");
  });

  it("let a form still choose its own setting", () => {
    render(<Input aria-label="url" inputMode="url" spellCheck />);
    expect(screen.getByLabelText("url")).toHaveAttribute("spellcheck", "true");
  });
});

describe("dialogs and sheets", () => {
  // One modal at a time: a second one hides the first from the accessibility tree.
  function expectScrolls(box: HTMLElement) {
    expect(box).toHaveClass("overflow-y-auto");
    expect(box.className).toContain("max-h-[calc(100dvh-2rem)]");
  }

  it("scroll inside when the phone keyboard leaves little room (dialog)", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Hộp</DialogTitle>
          <DialogDescription>Mô tả</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    expectScrolls(screen.getByRole("dialog"));
  });

  it("scroll inside when the phone keyboard leaves little room (question)", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>Hỏi</AlertDialogTitle>
          <AlertDialogDescription>Mô tả</AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expectScrolls(screen.getByRole("alertdialog"));
  });

  it("name the close button of a dialog footer in Vietnamese", () => {
    render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Hộp</DialogTitle>
          <DialogDescription>Mô tả</DialogDescription>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("button", { name: "Đóng" })).toBeInTheDocument();
    expect(screen.queryByText("Close")).not.toBeInTheDocument();
  });

  it("name the close button of a sheet in Vietnamese", () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Tấm</SheetTitle>
          <SheetDescription>Mô tả</SheetDescription>
        </SheetContent>
      </Sheet>,
    );
    expect(screen.getByRole("button", { name: "Đóng" })).toBeInTheDocument();
    expect(screen.queryByText("Close")).not.toBeInTheDocument();
  });
});

describe("admin source", () => {
  const files = sourceFiles(ADMIN_DIR);

  it("has no transition-all: only the properties that change are animated", () => {
    const offenders = files.filter((file) => readFileSync(file, "utf8").includes("transition-all"));
    expect(offenders).toEqual([]);
  });

  it("has no 12 px text (text-xs): older eyes need 13 px or more", () => {
    const offenders = files.filter((file) => /\btext-xs\b|text-\[1[0-2]px\]/.test(readFileSync(file, "utf8")));
    expect(offenders.map((file) => path.relative(ADMIN_DIR, file))).toEqual([]);
  });
});
