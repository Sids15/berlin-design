/**
 * Money formatting for the ordering app. Prices are stored as INR numerics;
 * we show them the Indian way (₹, lakh grouping) and hide the decimals when a
 * price is whole, which the whole seed menu is.
 */
const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** e.g. 2140 → "₹2,140", 460.5 → "₹460.5". */
export function formatINR(amount: number): string {
  return inr.format(amount);
}
