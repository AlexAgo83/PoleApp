export function computeDefaultInvoiceAmountCents(attendeesCount: number, maxSeats: number | null | undefined) {
  const seats = Number.isFinite(maxSeats) && (maxSeats ?? 0) > 0 ? (maxSeats as number) : 30;
  if (attendeesCount > 0) {
    return attendeesCount * 5000;
  }
  return seats * 3000;
}
