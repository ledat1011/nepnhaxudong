import { existsSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImgHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { CERTIFICATES, FooterCertificates } from "./FooterCertificates";

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
}));

describe("FooterCertificates", () => {
  it("shows the two real certificate photos, each with its caption", () => {
    render(<FooterCertificates dict={getDictionary("vi")} />);
    const list = screen.getByRole("list", { name: "Chứng nhận" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("OCOP 3 saoCông nhận năm 2024");
    expect(items[1]).toHaveTextContent("Đủ điều kiện ATTPHiệu lực đến 12/2027");
  });

  it("uses photo files that exist", () => {
    for (const { src } of CERTIFICATES) {
      expect(existsSync(join(process.cwd(), "public", src)), src).toBe(true);
    }
  });

  it("opens the lightbox at the clicked certificate and gives focus back on close", async () => {
    const user = userEvent.setup();
    render(<FooterCertificates dict={getDictionary("en")} />);
    const second = screen.getByRole("button", { name: /food safety certificate/i });
    await user.click(second);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("img")).toHaveAttribute("src", CERTIFICATES[1].src);
    // Both certificates are in the lightbox, so it has previous and next buttons.
    expect(within(dialog).getByRole("button", { name: "Next image" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(second).toHaveFocus();
  });
});
