import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BilingualField } from "@/components/admin/form/BilingualField";
import { FIELD_TARGETS, closedTab, fieldHref, fieldTarget, findField } from "./field-targets";

const text = { vi: "Hạt tròn", en: null };

function Form() {
  return (
    <div>
      <BilingualField label="Tên sản phẩm" value={text} onChange={() => {}} viRequired />
      <BilingualField label="Mô tả" value={text} onChange={() => {}} />
      <fieldset>
        <legend>Ảnh</legend>
        <button type="button">Chọn ảnh</button>
      </fieldset>
      <label htmlFor="zalo">Zalo (chỉ số)</label>
      <input id="zalo" />
      <div aria-label="Nội dung" contentEditable suppressContentEditableWarning />
      <div hidden>
        <label htmlFor="phone">Điện thoại</label>
        <input id="phone" />
      </div>
      <div role="tablist">
        <button type="button" role="tab" aria-selected="true">
          Tiếng Việt
        </button>
        <button type="button" role="tab" aria-selected="false">
          English
        </button>
      </div>
    </div>
  );
}

describe("fieldHref", () => {
  it("adds the field key, after any other query", () => {
    expect(fieldHref("/admin/san-pham/3", "product.description.en")).toBe("/admin/san-pham/3?o=product.description.en");
    expect(fieldHref("/admin/hanh-trinh", "timeline.title.en", { sua: 7 })).toBe("/admin/hanh-trinh?sua=7&o=timeline.title.en");
  });
});

describe("fieldTarget", () => {
  it("knows only the listed keys", () => {
    expect(fieldTarget("contact.zalo")).toBe(FIELD_TARGETS["contact.zalo"]);
    expect(fieldTarget("toString")).toBeNull();
    expect(fieldTarget(null)).toBeNull();
  });
});

describe("findField", () => {
  it("finds the English box inside the right group, even with a badge or a * in the texts", () => {
    render(<Form />);
    const field = findField(document.body, FIELD_TARGETS["product.description.en"]);
    const group = screen.getByRole("group", { name: /^Mô tả/ });
    expect(field).not.toBeNull();
    expect(group.contains(field)).toBe(true);
    expect(field).toHaveAccessibleName("English");
    const name = findField(document.body, FIELD_TARGETS["product.name.en"]);
    expect(screen.getByRole("group", { name: /^Tên sản phẩm/ }).contains(name)).toBe(true);
  });

  it("finds a button, a label that starts with the text, and an element named by aria-label", () => {
    render(<Form />);
    expect(findField(document.body, FIELD_TARGETS["product.images"])).toBe(screen.getByRole("button", { name: "Chọn ảnh" }));
    expect(findField(document.body, FIELD_TARGETS["contact.zalo"])).toBe(document.getElementById("zalo"));
    expect(findField(document.body, { label: "Nội dung" })).toHaveAttribute("contenteditable");
  });

  it("does not find a field that is hidden", () => {
    render(<Form />);
    expect(findField(document.body, { label: "Điện thoại" })).toBeNull();
  });
});

describe("closedTab", () => {
  it("gives the tab to open, nothing when it is open, and 'missing' when there is no such tab yet", () => {
    render(<Form />);
    expect(closedTab(document.body, { tab: "English", label: "x" })).toBe(screen.getByRole("tab", { name: "English" }));
    expect(closedTab(document.body, { tab: "Tiếng Việt", label: "x" })).toBeNull();
    expect(closedTab(document.body, { tab: "Thương hiệu", label: "x" })).toBe("missing");
    expect(closedTab(document.body, { label: "x" })).toBeNull();
  });
});
