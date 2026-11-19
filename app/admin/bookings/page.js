"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";
import { PAYMENT_LABELS, rupees } from "@/components/counter/format";
import { Chip, RefundRow, bookingRef, fmtTime } from "@/components/refunds/RefundRow";

const TICKET_STATUS = {
  unused: { label: "Unused", tone: "ok" },
  used: { label: "Scanned", tone: "muted" },
  expired: { label: "Expired", tone: "muted" },
  cancelled: { label: "Cancelled", tone: "bad" },
};
const REASONS = ["Customer request", "Ride closed", "Bad weather", "Duplicate booking", "Wrong ticket sold"];

const toPaise = (v) => Math.round((Number(v) || 0) * 100);

// ---------- Search + list ----------

export default function AdminBookingsPage() {
  const [openId, setOpenId] = useState(null);
  const [q, setQ] = useState("");
  const [searched, setSearched] = useState("");
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id && /^\d+$/.test(id)) setOpenId(id);
    search("");
  }, []);

  async function search(term) {
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch(`/refunds/bookings?q=${encodeURIComponent(term)}`, { token: getAdminToken() });
      setBookings(data.bookings);
      setSearched(term);
    } catch (err) {
      setError(err.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function closeDetail() {
    setOpenId(null);
    window.history.replaceState(null, "", "/admin/bookings");
    search(searched);
  }

  if (openId) return <BookingDetail id={openId} onBack={closeDetail} />;

  return (
    <div className="flex flex-col gap-4">
      <form
        className="card flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          search(q.trim());
        }}
      >
        <div className="field min-w-[220px] flex-1">
          <label className="label" htmlFor="bk-search">Find a booking</label>
          <input
            id="bk-search"
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Phone, email, ticket code, booking ID or name"
            autoComplete="off"
          />
        </div>
        <button className="btn w-auto px-5" type="submit" disabled={loading} style={{ minHeight: 48 }}>
          {loading ? "Searching…" : "Search"}
        </button>
        {searched && (
          <button
            type="button"
            className="btn btn-secondary w-auto px-4"
            style={{ minHeight: 48 }}
            onClick={() => {
              setQ("");
              search("");
            }}
          >
            Today
          </button>
        )}
      </form>

      <div className="card">
        <p className="muted m-0 mb-3 text-sm">
          {searched ? `Results for “${searched}”` : "Today's paid bookings (online and counter)"}
          {bookings && ` · ${bookings.length}${bookings.length === 100 ? "+" : ""}`}
        </p>
        {error && <p className="error-text">{error}</p>}
        {!bookings && !error && <p className="muted">Loading…</p>}
        {bookings && bookings.length === 0 && <p className="muted m-0">No bookings found.</p>}
        {bookings && bookings.length > 0 && (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Customer</th>
                  <th>Tickets</th>
                  <th>Paid</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="cursor-pointer" onClick={() => setOpenId(String(b.id))}>
                    <td className="whitespace-nowrap">
                      <div className="font-bold">{bookingRef(b.id)}</div>
                      <div className="muted text-xs">
                        {new Date(b.visit_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} ·{" "}
                        {b.source === "counter" ? "Counter" : "Online"}
                      </div>
                    </td>
                    <td>
                      <div className="whitespace-nowrap">{b.customer_name || "—"}</div>
                      <div className="muted whitespace-nowrap text-xs">
                        {[b.customer_phone, b.customer_email].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td className="min-w-[160px] text-xs">
                      {b.items_summary}
                      {b.cancelled_count > 0 && <div className="font-bold text-danger">{b.cancelled_count} cancelled</div>}
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="font-bold">{rupees(b.total_amount)}</div>
                      {Number(b.refunded_amount) > 0 && (
                        <div className="text-xs font-bold text-danger">−{rupees(b.refunded_amount)} refunded</div>
                      )}
                    </td>
                    <td className="text-right">
                      <span className="text-sm font-bold text-primary">Open →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Booking detail + cancel & refund ----------

function BookingDetail({ id, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState([]);
  const [notice, setNotice] = useState("");

  async function load() {
    setError("");
    try {
      setData(await apiFetch(`/refunds/bookings/${id}`, { token: getAdminToken() }));
    } catch (err) {
      setError(err.message || "Could not load booking");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error && !data) {
    return (
      <div className="card">
        <p className="error-text">{error}</p>
        <button className="btn btn-secondary w-auto px-4" onClick={onBack}>← Back</button>
      </div>
    );
  }
  if (!data) return <p className="muted">Loading…</p>;

  const { booking, items, refunds, summary } = data;
  const allTickets = items.flatMap((item) => item.tickets.map((t) => ({ ...t, unitPrice: item.unitPrice })));
  const selectable = summary.canRefund ? allTickets.filter((t) => t.status === "unused") : [];
  const selectedValue = allTickets.filter((t) => selected.includes(t.id)).reduce((sum, t) => sum + t.unitPrice, 0);

  function toggle(ticketId) {
    setSelected((list) => (list.includes(ticketId) ? list.filter((x) => x !== ticketId) : [...list, ticketId]));
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <button className="btn btn-secondary w-auto px-4" style={{ minHeight: 38 }} onClick={onBack}>
          ← All bookings
        </button>
      </div>

      {notice && <div className="status-banner success">{notice}</div>}

      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-xl font-extrabold">Booking {bookingRef(booking.id)}</h2>
            <p className="muted m-0 mt-1 text-sm">
              Visit {new Date(booking.visitDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              {" · "}booked {fmtTime(booking.createdAt)}
            </p>
            <p className="m-0 mt-2 text-sm">
              {[booking.customer.name, booking.customer.phone, booking.customer.email].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Chip tone="info">{booking.source === "counter" ? `Counter · sold by ${booking.soldBy}` : "Online"}</Chip>
            <Chip tone="muted">
              {booking.paymentMethod === "razorpay"
                ? "Paid via Razorpay"
                : booking.paymentMethod === "split"
                  ? `Cash ${rupees(booking.cashAmount)} + UPI ${rupees(booking.upiAmount)}`
                  : PAYMENT_LABELS[booking.paymentMethod]}
            </Chip>
          </div>
        </div>
        {booking.razorpayPaymentId && <p className="muted m-0 mt-2 font-mono text-xs">{booking.razorpayPaymentId}</p>}

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ["Paid", rupees(summary.paid), ""],
            ["Refunded", rupees(summary.refunded), summary.refunded > 0 ? "text-danger" : ""],
            ["Left to refund", rupees(summary.refundable), ""],
          ].map(([label, value, cls]) => (
            <div key={label} className="rounded-xl border border-line bg-paper p-3">
              <p className="muted m-0 text-xs font-semibold">{label}</p>
              <p className={`m-0 mt-0.5 text-lg font-bold ${cls}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="m-0">Tickets</h3>
          {selectable.length > 0 && (
            <button
              type="button"
              className="text-sm font-bold text-primary"
              onClick={() =>
                setSelected(selected.length === selectable.length ? [] : selectable.map((t) => t.id))
              }
            >
              {selected.length === selectable.length ? "Clear selection" : `Select all unused (${selectable.length})`}
            </button>
          )}
        </div>
        {!summary.canRefund && <p className="muted mt-0 text-sm">{summary.blockedReason}</p>}
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div key={item.bookingItemId}>
              <p className="m-0 mb-1.5 text-sm font-bold">
                {item.gameName}
                {item.variantLabel && <span className="muted font-normal"> · {item.variantLabel}</span>}
                <span className="muted font-normal"> · {rupees(item.unitPrice)} each</span>
              </p>
              <div className="flex flex-col gap-1.5">
                {item.tickets.map((t) => {
                  const canPick = summary.canRefund && t.status === "unused";
                  const st = TICKET_STATUS[t.status] || { label: t.status, tone: "muted" };
                  return (
                    <label key={t.id} className={`rf-ticket ${selected.includes(t.id) ? "selected" : ""} ${canPick ? "" : "locked"}`}>
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-[var(--color-primary)]"
                        checked={selected.includes(t.id)}
                        disabled={!canPick}
                        onChange={() => toggle(t.id)}
                      />
                      <span className="font-mono text-sm font-bold tracking-wider">#{t.code}</span>
                      <span className="flex-1" />
                      {t.status === "used" && t.scannedAt && <span className="muted text-xs">{fmtTime(t.scannedAt)}</span>}
                      <Chip tone={st.tone}>{st.label}</Chip>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {summary.canRefund && (summary.refundable > 0 || selectable.length > 0) && (
        <RefundForm
          key={refunds.length}
          booking={booking}
          summary={summary}
          selected={selected}
          selectedValue={selectedValue}
          onDone={(result, message) => {
            setData(result);
            setSelected([]);
            setNotice(message);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}

      <RefundHistory refunds={refunds} onChanged={load} />
    </div>
  );
}

function RefundForm({ booking, summary, selected, selectedValue, onDone }) {
  const hasRazorpay = summary.razorpayPaid > 0;
  const [rzp, setRzp] = useState("");
  const [cash, setCash] = useState("");
  const [upi, setUpi] = useState("");
  const [upiRef, setUpiRef] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Put an amount on the "natural" refund route for this booking: Razorpay for online, otherwise how they paid.
  function fill(amount) {
    let left = Math.min(amount, summary.refundable);
    const viaRzp = hasRazorpay ? Math.min(left, summary.razorpayRefundable) : 0;
    left = Math.round((left - viaRzp) * 100) / 100;
    setRzp(viaRzp ? String(viaRzp) : "");
    if (booking.paymentMethod === "upi") {
      setCash("");
      setUpi(left ? String(left) : "");
    } else {
      setCash(left ? String(left) : "");
      setUpi("");
    }
  }

  const selectionKey = selected.join(",");
  useEffect(() => {
    fill(selectedValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey]);

  const totalPaise = toPaise(rzp) + toPaise(cash) + toPaise(upi);
  const total = totalPaise / 100;
  const problems = useMemo(() => {
    const list = [];
    if ([rzp, cash, upi].some((v) => v !== "" && (!Number.isFinite(Number(v)) || Number(v) < 0))) list.push("Amounts must be 0 or more");
    if (totalPaise > toPaise(summary.refundable)) list.push(`Total is more than what's left on this booking (${rupees(summary.refundable)})`);
    if (toPaise(rzp) > toPaise(summary.razorpayRefundable)) list.push(`At most ${rupees(summary.razorpayRefundable)} can go back via Razorpay`);
    return list;
  }, [rzp, cash, upi, totalPaise, summary]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (problems.length) return setError(problems[0]);
    if (!reason.trim()) return setError("Enter a reason");

    const parts = [
      toPaise(rzp) && `${rupees(rzp)} via Razorpay`,
      toPaise(cash) && `${rupees(cash)} cash`,
      toPaise(upi) && `${rupees(upi)} UPI`,
    ].filter(Boolean);
    const lines = [
      selected.length ? `Cancel ${selected.length} ticket${selected.length > 1 ? "s" : ""} (their QR codes stop working).` : "No tickets will be cancelled.",
      parts.length ? `Refund ${rupees(total)}: ${parts.join(" + ")}.` : "No money will be refunded.",
      toPaise(rzp) ? "The Razorpay refund is sent now and can't be undone." : "",
    ].filter(Boolean);
    if (!window.confirm(`${lines.join("\n")}\n\nContinue?`)) return;

    setSaving(true);
    try {
      const result = await apiFetch("/refunds", {
        method: "POST",
        token: getAdminToken(),
        body: {
          bookingId: booking.id,
          ticketIds: selected,
          razorpayAmount: rzp || 0,
          cashAmount: cash || 0,
          upiAmount: upi || 0,
          upiRef: upiRef.trim() || undefined,
          reason: reason.trim(),
        },
      });
      const msg = [
        selected.length && `${selected.length} ticket${selected.length > 1 ? "s" : ""} cancelled`,
        total > 0 && `${rupees(total)} refunded`,
      ].filter(Boolean).join(" · ");
      onDone(result, `${msg}.${toPaise(rzp) ? " Razorpay usually takes 5–7 days to reach the customer." : ""}${toPaise(cash) ? ` Hand over ${rupees(cash)} cash.` : ""}`);
    } catch (err) {
      setError(err.message || "Refund failed");
    } finally {
      setSaving(false);
    }
  }

  const title = selected.length ? `Cancel ${selected.length} ticket${selected.length > 1 ? "s" : ""} & refund` : "Refund money";

  return (
    <form className="card flex flex-col gap-4" onSubmit={submit}>
      <div>
        <h3 className="m-0">{title}</h3>
        <p className="muted m-0 mt-1 text-sm">
          {selected.length
            ? `Ticket value ${rupees(selectedValue)}. Change the amounts below for a partial or custom refund.`
            : "No tickets selected. This refunds money only; every ticket stays valid."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {selected.length > 0 && (
          <button type="button" className="rf-quick" onClick={() => fill(selectedValue)}>
            Ticket value {rupees(selectedValue)}
          </button>
        )}
        <button type="button" className="rf-quick" onClick={() => fill(summary.refundable)}>
          Everything left {rupees(summary.refundable)}
        </button>
        <button type="button" className="rf-quick" onClick={() => fill(0)}>
          No refund
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {hasRazorpay && (
          <div className="field">
            <label className="label" htmlFor="rf-rzp">Razorpay (online)</label>
            <input id="rf-rzp" className="input" type="number" min="0" step="0.01" inputMode="decimal" value={rzp} onChange={(e) => setRzp(e.target.value)} placeholder="0" />
            <span className="muted text-xs">Max {rupees(summary.razorpayRefundable)} · back to their card/UPI</span>
          </div>
        )}
        <div className="field">
          <label className="label" htmlFor="rf-cash">Cash</label>
          <input id="rf-cash" className="input" type="number" min="0" step="0.01" inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="0" />
          <span className="muted text-xs">Hand over from the counter</span>
        </div>
        <div className="field">
          <label className="label" htmlFor="rf-upi">UPI</label>
          <input id="rf-upi" className="input" type="number" min="0" step="0.01" inputMode="decimal" value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="0" />
          <span className="muted text-xs">Send from the park&apos;s UPI</span>
        </div>
      </div>

      {toPaise(upi) > 0 && (
        <div className="field">
          <label className="label" htmlFor="rf-upiref">UPI transaction ID (optional)</label>
          <input id="rf-upiref" className="input" value={upiRef} onChange={(e) => setUpiRef(e.target.value)} placeholder="e.g. 4321 8765 0912" />
        </div>
      )}

      <div className="field">
        <label className="label" htmlFor="rf-reason">Reason</label>
        <input id="rf-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being refunded?" maxLength={300} />
        <div className="mt-1 flex flex-wrap gap-1.5">
          {REASONS.map((r) => (
            <button key={r} type="button" className="rf-quick small" onClick={() => setReason(r)}>{r}</button>
          ))}
        </div>
      </div>

      <div className="rf-total">
        <div>
          <p className="muted m-0 text-xs font-semibold">REFUND TOTAL</p>
          <p className="m-0 text-2xl font-extrabold">{rupees(total)}</p>
          {selected.length > 0 && totalPaise !== toPaise(selectedValue) && (
            <p className="muted m-0 text-xs">
              {totalPaise === 0 ? "Tickets will be cancelled without a refund" : `Ticket value is ${rupees(selectedValue)}`}
            </p>
          )}
        </div>
        <button className="btn btn-danger w-auto px-5" type="submit" disabled={saving || problems.length > 0 || (selected.length === 0 && totalPaise === 0)}>
          {saving ? "Processing…" : title}
        </button>
      </div>
      {(error || problems[0]) && <p className="error-text m-0">{error || problems[0]}</p>}
    </form>
  );
}

function RefundHistory({ refunds, onChanged }) {
  const [syncingId, setSyncingId] = useState(null);
  const [error, setError] = useState("");

  async function sync(refundId) {
    setError("");
    setSyncingId(refundId);
    try {
      await apiFetch(`/refunds/${refundId}/sync`, { method: "POST", token: getAdminToken() });
      await onChanged();
    } catch (err) {
      setError(err.message || "Could not check status");
    } finally {
      setSyncingId(null);
    }
  }

  if (refunds.length === 0) return null;
  return (
    <div className="card">
      <h3 className="mt-0">Refund history</h3>
      {error && <p className="error-text">{error}</p>}
      <div className="flex flex-col gap-3">
        {refunds.map((r) => (
          <RefundRow key={r.id} refund={r} onSync={sync} syncing={syncingId === r.id} />
        ))}
      </div>
    </div>
  );
}
