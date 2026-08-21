/**
 * Single source of site-wide facts: brand, navigation, and public business
 * details. These are intentionally public (they appear on the live page) —
 * no secrets belong in this file.
 */

export const brand = {
  name: "BERLIN",
  tagline: "HAUS DE GOURMET",
  description:
    "A rooftop gourmet house and bar where global flavours meet crafted cocktails and the city lights set the mood.",
} as const;

/** Primary navigation (Section 13). Order follows the arrival → night journey. */
export const nav = [
  { label: "Rooftop", href: "#rooftop" },
  { label: "Dining", href: "#dining" },
  { label: "Bar", href: "#bar" },
  { label: "After Dark", href: "#after-dark" },
  { label: "Menu", href: "#menu" },
  { label: "Reviews", href: "#reviews" },
  { label: "Visit", href: "#visit" },
] as const;

/** Public contact & location details (shown on the page — not secrets). */
export const contact = {
  phoneDisplay: "+91 78801 56565",
  phoneHref: "tel:+917880156565",
  address: {
    line1: "Level 06, High Street Apollo",
    line2: "Vijay Nagar, Indore",
    line3: "Madhya Pradesh 452010",
  },
  hours: "12:00 PM – 11:30 PM · Everyday",
} as const;

/** Proof strip (Section 20 · first mockup). Kept for a later stats block. */
export const proofPoints = [
  { value: "4.7 / 5", label: "1000+ Reviews" },
  { value: "Rooftop", label: "Sunset Views" },
  { value: "Full Bar", label: "Craft Cocktails" },
  { value: "Live Sports", label: "Big Screen" },
  { value: "Valet", label: "Service" },
] as const;

/**
 * The eight-stop journey (Section 21 numbering) that drives both the section
 * indices and the right-hand vertical progress rail (day → after-dark).
 */
export const journey = [
  { index: "01", id: "experience", label: "The Experience" },
  { index: "02", id: "rooftop", label: "The Rooftop" },
  { index: "03", id: "dining", label: "Dining" },
  { index: "04", id: "bar", label: "The Bar" },
  { index: "05", id: "after-dark", label: "After Dark" },
  { index: "06", id: "menu", label: "The Table" },
  { index: "07", id: "reviews", label: "Reviews" },
  { index: "08", id: "visit", label: "Visit" },
] as const;
