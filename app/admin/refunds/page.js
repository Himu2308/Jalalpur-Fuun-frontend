"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";
import { rupees, todayISO } from "@/components/counter/format";
import { RefundRow, bookingRef } from "@/components/refunds/RefundRow";

export default function AdminRefundsPage() {
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncingId, setSyncingId] = useState(null);

  async function load() {
    setError("");
    setLoading(true);
    try {
      setData(await apiFetch(`/refunds?${new URLSearchParams({ from, to })}`, { token: getAdminToken() }));
    } catch (err) {
      setError(err.message || "Could not load refunds");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  async function sync(refundId) {
    setError("");
    setSyncingId(refundId);
    try {
      const res = await apiFetch(`/refunds/${refundId}/sync`, { method: "POST", token: getAdminToken() });
      setData((d) => ({ ...d, refunds: d.refunds.map((r) => (r.id === refundId ? { ...r, ...res.refund } : r)) }));
    } catch (err) {
      setError(err.message || "Could not check status");
    } finally {
      setSyncingId(null);
    }
  }

  const totals = data?.totals;

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-wrap items-end gap-3">
        <div className="field">
          <label className="label" htmlFor="rf-from">From</label>
          <input id="rf-from" className="input" type="date" value={from} max={todayISO()} onChange={(e) => setFrom(e.target.value || todayISO())} />
        </div>
        <div className="field">
          <label className="label" htmlFor="rf-to">To</label>
          <input id="rf-to" className="input" type="date" value={to} min={from} max={todayISO()} onChange={(e) => setTo(e.target.value || todayISO())} />
        </div>
        <button className="btn btn-secondary w-auto px-4" style={{ minHeight: 48 }} onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
        <Link href="/admin/bookings" className="btn w-auto px-4 no-underline" style={{ minHeight: 48 }}>
          New refund
        </Link>
      </div>

      {totals && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Total refunded", rupees(totals.amount), `${totals.count} refund${totals.count === 1 ? "" : "s"} · ${totals.tickets} tickets cancelled`],
            ["Razorpay", rupees(totals.razorpay), totals.razorpayPending > 0 ? `${rupees(totals.razorpayPending)} still processing` : "Back to card / UPI"],
            ["Cash", rupees(totals.cash), "Paid out from the counter"],
            ["UPI", rupees(totals.upi), "Sent from the park's UPI"],
          ].map(([label, value, hint]) => (
            <div key={label} className="card" style={{ padding: 14 }}>
              <p className="muted m-0 text-xs font-semibold">{label}</p>
              <p className="m-0 mt-1 text-xl font-bold">{value}</p>
              <p className="muted m-0 text-[0.7rem]">{hint}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        {error && <p className="error-text">{error}</p>}
        {!data && !error && <p className="muted">Loading…</p>}
        {totals?.razorpayFailed > 0 && (
          <p className="error-text mt-0">{rupees(totals.razorpayFailed)} of Razorpay refunds failed. Open the booking to refund it another way.</p>
        )}
        {data && data.refunds.length === 0 && <p className="muted m-0">No refunds in this period.</p>}
        <div className="flex flex-col gap-3">
          {data?.refunds.map((r) => (
            <RefundRow key={r.id} refund={r} onSync={sync} syncing={syncingId === r.id}>
              <p className="m-0 mt-1 text-xs">
                <Link href={`/admin/bookings?id=${r.bookingId}`} className="font-bold text-primary">
                  {bookingRef(r.bookingId)}
                </Link>
                <span className="muted">
                  {" · "}{r.source === "counter" ? "Counter" : "Online"} · paid {rupees(r.bookingTotal)}
                  {" · "}{[r.customer.name, r.customer.phone, r.customer.email].filter(Boolean).join(" · ")}
                </span>
              </p>
            </RefundRow>
          ))}
        </div>
      </div>
    </div>
  );
}
