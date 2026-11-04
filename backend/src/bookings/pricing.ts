/**
 * Hotel pricing in Bangladeshi taka (BDT).
 * Hotels in Bangladesh quote a room rate and then add a service charge and VAT on top,
 * so the guest-facing total is higher than nights x rate. All of it is calculated HERE,
 * on the server, so the frontend can only display it, never decide it.
 */
export const SERVICE_CHARGE_RATE = 0.1; // 10% of the room rate
export const VAT_RATE = 0.15; // 15% of (room rate + service charge)

export interface Pricing {
  nights: number;
  pricePerNight: number;
  subtotal: number; // nights x pricePerNight
  serviceCharge: number;
  vat: number;
  totalAmount: number; // what the guest pays
}

/** Whole-taka amounts only, so no fractions ever show up on a receipt. */
export function calculatePricing(nights: number, pricePerNight: number): Pricing {
  const subtotal = nights * pricePerNight;
  const serviceCharge = Math.round(subtotal * SERVICE_CHARGE_RATE);
  const vat = Math.round((subtotal + serviceCharge) * VAT_RATE);
  return { nights, pricePerNight, subtotal, serviceCharge, vat, totalAmount: subtotal + serviceCharge + vat };
}
