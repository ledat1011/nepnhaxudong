import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { SiteHeader } from "./SiteHeader";

// Draws the loading note inside its link, so the test can see which links have one.
vi.mock("@/components/ui/LinkPendingStatus", () => ({
  LinkPendingStatus: ({ label }: { label: string }) => <span data-pending-label={label} />,
}));

const dict = getDictionary("vi");

describe("SiteHeader loading feedback", () => {
  it("gives the logo and every nav link the page loading note and bar", () => {
    const { container } = render(
      <SiteHeader
        lang="vi"
        dict={dict}
        nav={[{ id: "san-pham", label: "Sản phẩm" }]}
        zalo={null}
        alternateHref="/en"
      />,
    );
    const logo = screen.getByRole("link", { name: /Nếp Nhà/ });
    const nav = screen.getByRole("navigation", { name: dict.nav.label });
    const links = [logo, ...within(nav).getAllByRole("link")];
    for (const link of links) {
      expect(link.querySelector(`[data-pending-label="${dict.loading.page}"]`)).not.toBeNull();
    }
    // The menu panel for small screens has the same links, each with its own note.
    expect(container.querySelectorAll("[data-pending-label]").length).toBe(1 + 2 + 1);
  });
});
