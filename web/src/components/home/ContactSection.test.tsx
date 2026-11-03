import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Contact } from "@/lib/content/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ContactSection } from "./ContactSection";

const dict = getDictionary("vi");

const CONTACT: Contact = {
  phone: "0000 000 000",
  zalo: "0000 000 001",
  messenger: "https://example.com/messenger",
  address: "[MẪU] Xứ Đông",
  mapUrl: "https://example.com/ban-do",
  hours: "[MẪU] 8:00 đến 20:00",
};

const EMPTY: Contact = {
  phone: null,
  zalo: null,
  messenger: null,
  address: null,
  mapUrl: null,
  hours: null,
};

function renderContact(contact: Contact = CONTACT) {
  return render(<ContactSection dict={dict} contact={contact} />);
}

describe("ContactSection", () => {
  it("has the section heading", () => {
    renderContact();
    expect(screen.getByRole("heading", { level: 2, name: dict.sections.contact })).toHaveAttribute(
      "id",
      "lien-he",
    );
  });

  it("links the phone, Zalo and Messenger", () => {
    renderContact();
    expect(screen.getByRole("link", { name: /0000 000 000/ })).toHaveAttribute(
      "href",
      "tel:0000000000",
    );
    expect(screen.getByRole("link", { name: dict.contact.zalo })).toHaveAttribute(
      "href",
      "https://zalo.me/0000000001",
    );
    expect(screen.getByRole("link", { name: dict.contact.messenger })).toHaveAttribute(
      "href",
      "https://example.com/messenger",
    );
  });

  it("shows the address, hours and a map link that opens in a new tab", () => {
    renderContact();
    expect(screen.getByText("[MẪU] Xứ Đông")).toBeInTheDocument();
    expect(screen.getByText("[MẪU] 8:00 đến 20:00")).toBeInTheDocument();
    const map = screen.getByRole("link", { name: dict.contact.viewMap });
    expect(map).toHaveAttribute("href", "https://example.com/ban-do");
    expect(map).toHaveAttribute("target", "_blank");
    expect(map).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("has no form and no embedded map", () => {
    const { container } = renderContact();
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("hides a channel that is null", () => {
    renderContact({ ...CONTACT, messenger: null, mapUrl: null, hours: null });
    expect(screen.queryByRole("link", { name: dict.contact.messenger })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: dict.contact.viewMap })).not.toBeInTheDocument();
    expect(screen.queryByText(dict.contact.hours)).not.toBeInTheDocument();
  });

  it("renders only the heading when every field is null", () => {
    renderContact(EMPTY);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });
});
