/**
 * Bill math. A tab's item subtotal, plus a service charge, plus GST on
 * (subtotal + service). Rates are constants — change them here. All amounts are
 * rounded to whole rupees at each step so the printed lines add up exactly.
 */
export const SERVICE_RATE = 0.1; // 10% service charge
export const GST_RATE = 0.05; // 5% GST, applied on subtotal + service

export interface BillTotals {
  subtotal: number;
  service: number;
  gst: number;
  total: number;
}

const round = (n: number) => Math.round(n);

export function computeBill(subtotal: number): BillTotals {
  const sub = round(subtotal);
  const service = round(sub * SERVICE_RATE);
  const gst = round((sub + service) * GST_RATE);
  return { subtotal: sub, service, gst, total: sub + service + gst };
}
