import { describe, expect, it } from "vitest";

import { computeDefaultInvoiceAmountCents } from "../billing";

describe("computeDefaultInvoiceAmountCents", () => {
  it("uses attendees count when > 0", () => {
    expect(computeDefaultInvoiceAmountCents(2, 30)).toBe(10000);
    expect(computeDefaultInvoiceAmountCents(5, 10)).toBe(25000);
  });

  it("falls back to maxSeats when no attendees", () => {
    expect(computeDefaultInvoiceAmountCents(0, 30)).toBe(90000);
    expect(computeDefaultInvoiceAmountCents(0, 10)).toBe(30000);
  });

  it("handles undefined or zero maxSeats with default 30", () => {
    expect(computeDefaultInvoiceAmountCents(0, undefined)).toBe(90000);
    expect(computeDefaultInvoiceAmountCents(0, null)).toBe(90000);
    expect(computeDefaultInvoiceAmountCents(0, 0)).toBe(90000);
  });
});
