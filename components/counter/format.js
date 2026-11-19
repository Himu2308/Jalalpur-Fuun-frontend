export function rupees(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export const PAYMENT_LABELS = { cash: "Cash", upi: "UPI", split: "Cash + UPI" };

export function variantText(variant) {
  const mode = variant.mode.charAt(0).toUpperCase() + variant.mode.slice(1);
  return `${mode} · ${variant.minutes} min`;
}
