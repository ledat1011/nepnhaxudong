import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Contact, Social } from "@/lib/content/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { SiteFooter } from "./SiteFooter";

const CONTACT: Contact = {
  phone: "0000 000 000",
  zalo: "0000 000 001",
  messenger: "https://example.com/messenger",
  address: "[MẪU] Địa chỉ",
  mapUrl: null,
  hours: null,
};

const SOCIAL: Social = {
  facebook: "https://example.com/facebook",
  youtube: "https://example.com/youtube",
  tiktok: null,
};

function renderFooter(contact: Contact = CONTACT, social: Social = SOCIAL) {
  return render(
    <SiteFooter dict={getDictionary("vi")} contact={contact} social={social} year={2030} />,
  );
}

describe("SiteFooter", () => {
  it("has no TikTok link when tiktok is null", () => {
    renderFooter();
    expect(screen.queryByRole("link", { name: "TikTok" })).not.toBeInTheDocument();
  });

  it("opens social links safely in a new tab", () => {
    renderFooter();
    for (const name of ["Facebook", "YouTube"]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
      expect(link.getAttribute("rel")).toContain("noreferrer");
    }
  });

  it("shows the phone number as a tel link", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: "0000 000 000" })).toHaveAttribute(
      "href",
      "tel:0000000000",
    );
  });

  it("shows the Zalo number as a link that opens the Zalo contact dialog", () => {
    renderFooter();
    const link = screen.getByRole("link", { name: "0000 000 001" });
    expect(link).toHaveAttribute("href", "https://zalo.me/0000000001");
    expect(link).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("leaves out contact fields that are null", () => {
    renderFooter({ ...CONTACT, phone: null, address: null });
    expect(screen.queryByRole("link", { name: "0000 000 000" })).not.toBeInTheDocument();
    expect(screen.queryByText("[MẪU] Địa chỉ")).not.toBeInTheDocument();
  });

  it("shows the copyright with the given year", () => {
    renderFooter();
    expect(screen.getByText("Bản quyền © 2030 Nếp Nhà")).toBeInTheDocument();
  });

  it("uses the current year by default", () => {
    render(<SiteFooter dict={getDictionary("vi")} contact={CONTACT} social={SOCIAL} />);
    const year = new Date().getFullYear();
    expect(screen.getByText(`Bản quyền © ${year} Nếp Nhà`)).toBeInTheDocument();
  });
});
