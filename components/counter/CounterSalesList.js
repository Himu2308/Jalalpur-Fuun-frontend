"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import SaleTickets from "./SaleTickets";
import { PAYMENT_LABELS, rupees, todayISO } from "./format";

// Counter sales for a day with cash/UPI totals. Admin sees every seller; a worker only their own (enforced by the API).
export default function CounterSalesList({ token, isAdmin = false }) {
  const [date, setDate] = useState(todayISO());
  const [seller, setSeller] = useState("");
  const [staff, setStaff] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [openSale, setOpenSale] = useState(null);
  const [openingId, setOpeningId] = useState(null);

  useEffect(() => {
    if (!isAdmin) return;
    apiFetch("/staff", { token })
      .then((res) => setStaff(res.staff))
      .catch(() => {});
  }, [isAdmin, token]);

  async function load() {
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      if (seller) params.set("seller", seller);
      setData(await apiFetch(`/counter/sales?${params}`, { token }));
    } catch (err) {
      setError(err.message || "Could not load sales");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, seller]);

  async function open(id) {
    setOpeningId(id);
    try {
      const res = await apiFetch(`/counter/sales/${id}`, { token });
      setOpenSale(res.sale);
    } catch (err) {
      setError(err.message || "Could not open sale");
    } finally {
      setOpeningId(null);
    }
  }

  if (openSale) return <SaleTickets sale={openSale} onDone={() => setOpenSale(null)} doneLabel="Back to sales" />;

  const totals = data?.totals;

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-wrap items-end gap-3">
        <div className="field">
          <label className="label" htmlFor="sales-date">Date</label>
          <input id="sales-date" className="input" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value || todayISO())} />
        </div>
        {isAdmin && (
          <div className="field min-w-[180px] flex-1">
            <label className="label" htmlFor="sales-seller">Sold by</label>
            <select id="sales-seller" className="input" value={seller} onChange={(e) => setSeller(e.target.value)}>
              <option value="">Everyone</option>
              <option value="admin">Admin</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.uid}{s.name ? ` — ${s.name}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          className="btn btn-secondary w-auto px-4"
          style={{ minHeight: 48 }}
          onClick={load}
          disabled={loading}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {totals && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(() => {
            const cashOut = totals.refundedCash + totals.onlineRefundedCash;
            const upiOut = totals.refundedUpi + totals.onlineRefundedUpi;
            return [
              ["Net collected", rupees(totals.total - cashOut - upiOut), `${totals.sales} sale${totals.sales === 1 ? "" : "s"}${cashOut + upiOut > 0 ? ` · ${rupees(cashOut + upiOut)} refunded` : ""}`],
              ["Cash in drawer", rupees(totals.cash - cashOut), cashOut > 0 ? `${rupees(totals.cash)} taken − ${rupees(cashOut)} refunded` : "Should be in the drawer"],
              ["UPI (net)", rupees(totals.upi - upiOut), upiOut > 0 ? `${rupees(totals.upi)} received − ${rupees(upiOut)} refunded` : "Check against UPI app"],
              ["Tickets", String(totals.tickets), totals.cancelledTickets > 0 ? `Valid · ${totals.cancelledTickets} cancelled` : "Issued at counter"],
            ];
          })().map(([label, value, hint]) => (
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
        {!data && !error && <p className="muted">Loading...</p>}
        {data && data.sales.length === 0 && <p className="muted m-0">No counter sales on this day.</p>}
        {data && data.sales.length > 0 && (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Tickets</th>
                  <th>Amount</th>
                  {isAdmin && <th>Sold by</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.sales.map((s) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap">
                      {new Date(s.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      <div className="muted text-xs">#{s.id}</div>
                    </td>
                    <td>
                      <div className="whitespace-nowrap">{s.customer_name || "—"}</div>
                      <div className="muted whitespace-nowrap text-xs">
                        {[s.customer_phone, s.customer_email].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td className="min-w-[160px] text-xs">{s.items_summary}</td>
                    <td className="whitespace-nowrap">
                      <div className="font-bold">{rupees(s.total_amount)}</div>
                      <div className="muted text-xs">
                        {s.payment_method === "split"
                          ? `Cash ${rupees(s.cash_amount)} + UPI ${rupees(s.upi_amount)}`
                          : PAYMENT_LABELS[s.payment_method]}
                      </div>
                      {s.upi_ref && <div className="muted font-mono text-xs">{s.upi_ref}</div>}
                      {Number(s.refunded_cash) + Number(s.refunded_upi) > 0 && (
                        <div className="text-xs font-bold text-danger">
                          Refunded {rupees(Number(s.refunded_cash) + Number(s.refunded_upi))}
                          {s.cancelled_count > 0 && ` · ${s.cancelled_count} cancelled`}
                        </div>
                      )}
                    </td>
                    {isAdmin && <td className="whitespace-nowrap">{s.sold_by_uid || "Admin"}</td>}
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ width: "auto", minHeight: 32, padding: "4px 10px", fontSize: "0.75rem" }}
                        onClick={() => open(s.id)}
                        disabled={openingId === s.id}
                      >
                        {openingId === s.id ? "…" : "Tickets"}
                      </button>
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
