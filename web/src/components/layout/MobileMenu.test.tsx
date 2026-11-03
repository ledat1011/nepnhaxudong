import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MobileMenu } from "./MobileMenu";

function renderMenu() {
  return render(
    <MobileMenu label="Mở menu" closeLabel="Đóng menu">
      <ul>
        <li>
          <a href="/vi#san-pham">Sản phẩm</a>
        </li>
      </ul>
    </MobileMenu>,
  );
}

describe("MobileMenu", () => {
  it("starts closed with the menu hidden", () => {
    renderMenu();
    const button = screen.getByRole("button", { name: "Mở menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Sản phẩm" })).not.toBeInTheDocument();
  });

  it("points aria-controls at the menu panel", () => {
    const { container } = renderMenu();
    const button = screen.getByRole("button", { name: "Mở menu" });
    const panelId = button.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    expect(container.querySelector(`[id="${panelId}"]`)).not.toBeNull();
  });

  it("opens when the button is clicked", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "Mở menu" }));
    const button = screen.getByRole("button", { name: "Đóng menu" });
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Sản phẩm" })).toBeVisible();
  });

  it("closes on Escape and returns focus to the button", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "Mở menu" }));
    screen.getByRole("link", { name: "Sản phẩm" }).focus();
    await user.keyboard("{Escape}");
    const button = screen.getByRole("button", { name: "Mở menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
    expect(screen.queryByRole("link", { name: "Sản phẩm" })).not.toBeInTheDocument();
  });

  it("closes when a link inside the menu is clicked", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "Mở menu" }));
    await user.click(screen.getByRole("link", { name: "Sản phẩm" }));
    expect(screen.getByRole("button", { name: "Mở menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("ignores Escape while closed", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Mở menu" })).not.toHaveFocus();
  });
});
