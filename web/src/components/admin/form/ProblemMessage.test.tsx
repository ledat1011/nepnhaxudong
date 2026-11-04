import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import { ProblemMessage } from "./ProblemMessage";

describe("ProblemMessage", () => {
  it("shows the detail in an alert", () => {
    render(<ProblemMessage error={new AdminApiError(409, "Ảnh đang được dùng.")} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Ảnh đang được dùng.");
  });

  it("renders nothing without an error", () => {
    const { container } = render(<ProblemMessage error={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
