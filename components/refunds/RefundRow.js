"use client";

import { rupees } from "@/components/counter/format";

export const RZP_STATUS = {
  pending: { label: "Razorpay: processing", tone: "warn" },
  processed: { label: "Razorpay: sent to customer", tone: "ok" },
  failed: { label: "Razorpay: failed", tone: "bad" },
};

export const bookingRef = (id) => `JF-${String(id).padStart(5, "0")}`;

export const fmtTime = (d) =>
  new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function Chip({ tone = "muted", children }) {
  return <span className={`rf-chip ${tone}`}>{children}</span>;
}

// One refund: amount, how it went back (Razorpay / cash / UPI), reason, and Razorpay status with a "Check status" button.
export function RefundRow({ refund: r, onSync, syncing, children }) {
  const rzp = RZP_STATUS[r.razorpayStatus];
  return (
    <div className="rounded-xl border border-line bg-paper p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="m-0 text-base font-bold">
            {rupees(r.amount)}
            {r.ticketCount > 0 && <span className="muted text-sm font-normal"> · {r.ticketCount} ticket{r.ticketCount > 1 ? "s" : ""} cancelled</span>}
          </p>
          <p className="muted m-0 text-xs">{fmtTime(r.createdAt)} · {r.reason}</p>
          {children}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {r.razorpayAmount > 0 && <Chip tone={rzp?.tone}>{rupees(r.razorpayAmount)} · {rzp?.label || r.razorpayStatus}</Chip>}
          {r.cashAmount > 0 && <Chip>Cash {rupees(r.cashAmount)}</Chip>}
          {r.upiAmount > 0 && <Chip>UPI {rupees(r.upiAmount)}{r.upiRef ? ` · ${r.upiRef}` : ""}</Chip>}
          {r.amount === 0 && <Chip>No money refunded</Chip>}
        </div>
      </div>
      {r.razorpayRefundId && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="muted font-mono text-xs">{r.razorpayRefundId}</span>
          {r.razorpayStatus !== "processed" && onSync && (
            <button type="button" className="rf-quick small" onClick={() => onSync(r.id)} disabled={syncing}>
              {syncing ? "Checking…" : "Check status"}
            </button>
          )}
        </div>
      )}
      {r.razorpayStatus === "failed" && (
        <p className="error-text m-0 mt-1 text-xs">
          Razorpay could not refund this. It no longer counts as refunded, so you can refund the amount again in cash or UPI.
        </p>
      )}
    </div>
  );
}
