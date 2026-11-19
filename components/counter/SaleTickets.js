"use client";

import { QRCodeSVG } from "qrcode.react";
import { PAYMENT_LABELS, rupees } from "./format";

// Printable QR tickets for a counter sale. Only the `.print-area` part is printed (see globals.css).
export default function SaleTickets({ sale, onDone, doneLabel = "New sale", justSold = false }) {
  const tickets = sale.items.flatMap((item) =>
    item.tickets.map((ticket) => ({ ...ticket, gameName: item.gameName, variantLabel: item.variantLabel }))
  );
  const visitDate = new Date(sale.visitDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const customer = [sale.customer.name, sale.customer.phone, sale.customer.email].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-4">
      <div className="card no-print">
        {justSold && (
          <div className="status-banner success" style={{ padding: "14px 16px", fontSize: "1.05rem", marginBottom: 12 }}>
            Sale complete — {tickets.length} ticket{tickets.length > 1 ? "s" : ""}
          </div>
        )}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="m-0 text-sm font-bold">Sale #{sale.id} · {rupees(sale.total)}</p>
            <p className="muted m-0">
              {PAYMENT_LABELS[sale.paymentMethod]}
              {sale.paymentMethod === "split" && ` (cash ${rupees(sale.cashAmount)} + UPI ${rupees(sale.upiAmount)})`}
              {sale.upiRef && ` · UPI ref ${sale.upiRef}`}
            </p>
            <p className="muted m-0">{customer}</p>
            <p className="m-0 mt-1 text-xs font-semibold" style={{ color: sale.linkedToAccount ? "var(--color-success)" : "var(--color-ink-muted)" }}>
              {sale.linkedToAccount
                ? "✓ Also showing in the customer's app account"
                : "Will appear in the customer's app when they log in with this email / phone"}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn w-auto px-4" style={{ minHeight: 40 }} onClick={() => window.print()}>
              Print tickets
            </button>
            {onDone && (
              <button className="btn btn-secondary w-auto px-4" style={{ minHeight: 40 }} onClick={onDone}>
                {doneLabel}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="print-area grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
        {tickets.map((ticket, index) => (
          <div key={ticket.qrToken} className="print-ticket card flex flex-col items-center gap-1 text-center" style={{ padding: 14 }}>
            <p className="m-0 text-[0.62rem] font-extrabold tracking-[0.18em]">JALALPUR FUUN</p>
            <p className="m-0 text-base font-bold">{ticket.gameName}</p>
            {ticket.variantLabel && <p className="m-0 text-xs">{ticket.variantLabel}</p>}
            <div style={{ position: "relative", margin: "6px 0", opacity: ticket.status === "unused" ? 1 : 0.35 }}>
              <QRCodeSVG value={ticket.qrToken} size={150} level="M" />
            </div>
            {ticket.status !== "unused" && (
              <p className="m-0 text-xs font-bold text-danger no-print">{{ used: "ALREADY USED", cancelled: "CANCELLED / REFUNDED" }[ticket.status] || "EXPIRED"}</p>
            )}
            <p className="m-0 font-mono text-sm font-bold tracking-[0.12em]">#{ticket.qrToken.slice(-8).toUpperCase()}</p>
            <p className="m-0 text-[0.7rem]">Valid on {visitDate} only · Ticket {index + 1}/{tickets.length}</p>
            {customer && <p className="m-0 text-[0.65rem] text-ink-muted">{customer}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
