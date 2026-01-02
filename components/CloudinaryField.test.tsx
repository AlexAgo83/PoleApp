import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CloudinaryField } from "./CloudinaryField";

vi.mock("./CloudinaryUpload", () => ({
  CloudinaryUpload: ({ onChange }: { onChange: (url: string | null, publicId?: string | null) => void }) => (
    <button type="button" onClick={() => onChange("https://example.com/img", "new-id")}>
      trigger-upload
    </button>
  ),
}));

describe("CloudinaryField", () => {
  it("persists currentPublicId into hidden input and updates on change", () => {
    render(
      <CloudinaryField
        name="photoPublicId"
        label="Uploader"
        folder="poleapp/test"
        currentPublicId="initial-id"
      />
    );

    const hidden = screen.getByDisplayValue("initial-id") as HTMLInputElement;
    expect(hidden).toHaveAttribute("name", "photoPublicId");

    fireEvent.click(screen.getByText("trigger-upload"));
    expect(hidden.value).toBe("new-id");
  });
});
