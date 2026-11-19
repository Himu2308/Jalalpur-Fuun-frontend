"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import SaleTickets from "./SaleTickets";
import { rupees, variantText } from "./format";

const EMPTY_CUSTOMER = { phone: "", email: "", name: "" };
const EMPTY_PAYMENT = { method: "cash", cashAmount: "", upiRef: "" };

function lineKey(gameKey, variantId) {
  return `${gameKey}:${variantId ?? ""}`;
}

// Walk-in ticket sale at the counter, used by both the admin panel and the staff app.
export default function CounterSale({ token }) {
  const [games, setGames] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [cart, setCart] = useState({}); // lineKey -> { gameKey, variantId, name, label, price, quantity }
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [payment, setPayment] = useState(EMPTY_PAYMENT);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sale, setSale] = useState(null);

  async function loadGames() {
    setLoadError("");
    try {
      const data = await apiFetch("/games");
      setGames(data.games);
    } catch (err) {
      setLoadError(err.message || "Could not load activities");
    }
  }

  useEffect(() => {
    loadGames();
  }, []);

  const lines = Object.entries(cart);
  const total = useMemo(
    () => Object.values(cart).reduce((sum, line) => sum + line.price * line.quantity, 0),
    [cart]
  );
  const cashPart = payment.method === "split" ? Number(payment.cashAmount) || 0 : 0;
  const upiPart = payment.method === "split" ? Math.max(total - cashPart, 0) : 0;

  function addLine(game, variant) {
    const key = lineKey(game.key, variant?.id);
    setCart((current) => {
      const existing = current[key];
      return {
        ...current,
        [key]: existing
          ? { ...existing, quantity: existing.quantity + 1 }
          : {
              gameKey: game.key,
              variantId: variant?.id ?? null,
              name: game.name,
              label: variant ? variantText(variant) : null,
              price: Number(variant ? variant.pricePerPerson : game.price_per_person),
              quantity: 1,
            },
      };
    });
  }

  function changeQuantity(key, delta) {
    setCart((current) => {
      const line = current[key];
      if (!line) return current;
      const quantity = line.quantity + delta;
      const next = { ...current };
      if (quantity <= 0) delete next[key];
      else next[key] = { ...line, quantity };
      return next;
    });
  }

  function resetSale() {
    setSale(null);
    setCart({});
    setCustomer(EMPTY_CUSTOMER);
    setPayment(EMPTY_PAYMENT);
    setError("");
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (lines.length === 0) return setError("Add at least one activity");
    const phone = customer.phone.trim();
    const email = customer.email.trim();
    if (!phone && !email) return setError("Enter the customer's phone number or email");
    if (phone && !/^[6-9]\d{9}$/.test(phone)) return setError("Enter a valid 10-digit mobile number");
    if (payment.method === "split" && (cashPart <= 0 || cashPart >= total)) {
      return setError("For split payment, enter a cash amount more than ₹0 and less than the total");
    }

    setSubmitting(true);
    try {
      const data = await apiFetch("/counter/sales", {
        method: "POST",
        token,
        body: {
          items: Object.values(cart).map((line) => ({
            gameKey: line.gameKey,
            variantId: line.variantId,
            quantity: line.quantity,
          })),
          customer: { phone: phone || null, email: email || null, name: customer.name.trim() || null },
          payment: {
            method: payment.method,
            cashAmount: payment.method === "split" ? cashPart : undefined,
            upiRef: payment.method !== "cash" ? payment.upiRef.trim() || null : null,
          },
          expectedTotal: total,
        },
      });
      setSale(data.sale);
    } catch (err) {
      setError(err.message || "Could not complete the sale");
      if (err.status === 409) {
        // Prices changed: reload the catalog and clear the cart so the new total is shown before charging.
        setCart({});
        loadGames();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (sale) return <SaleTickets sale={sale} onDone={resetSale} justSold />;

  return (
    <form onSubmit={submit} className="@container">
      <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_380px] @3xl:items-start">
        {/* Activities */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>1. Choose activities</h3>
          {loadError && <p className="error-text">{loadError}</p>}
          {!games && !loadError && <p className="muted">Loading...</p>}
          {games && games.length === 0 && <p className="muted">No activities available.</p>}
          <div className="flex flex-col gap-3">
            {games?.map((game) =>
              game.variants.length === 0 ? (
                <button
                  key={game.key}
                  type="button"
                  className="counter-option"
                  onClick={() => addLine(game)}
                >
                  <span className="font-bold">{game.name}</span>
                  <span>{rupees(game.price_per_person)} <b>+</b></span>
                </button>
              ) : (
                <div key={game.key} className="rounded-2xl border border-line p-2.5">
                  <p className="m-0 mb-2 px-1 font-bold">{game.name}</p>
                  <div className="grid grid-cols-1 gap-2 @sm:grid-cols-2">
                    {game.variants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        className="counter-option counter-option-sm"
                        onClick={() => addLine(game, variant)}
                      >
                        <span>{variantText(variant)}</span>
                        <span>{rupees(variant.pricePerPerson)} <b>+</b></span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 @3xl:sticky @3xl:top-24">
          {/* Cart */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>2. Tickets</h3>
            {lines.length === 0 && <p className="muted">Tap an activity to add a ticket.</p>}
            <div className="flex flex-col">
              {lines.map(([key, line]) => (
                <div key={key} className="flex items-center justify-between gap-2 border-b border-line py-2">
                  <div className="min-w-0">
                    <p className="m-0 text-sm font-semibold">{line.name}</p>
                    <p className="muted m-0 text-xs">
                      {line.label ? `${line.label} · ` : ""}{rupees(line.price)} each
                    </p>
                  </div>
                  <div className="qty-control shrink-0">
                    <button type="button" className="qty-btn" onClick={() => changeQuantity(key, -1)} aria-label="Remove one">−</button>
                    <span className="qty-value">{line.quantity}</span>
                    <button type="button" className="qty-btn" onClick={() => changeQuantity(key, 1)} aria-label="Add one">+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-lg font-bold">
              <span>Total</span>
              <span>{rupees(total)}</span>
            </div>
          </div>

          {/* Customer */}
          <div className="card flex flex-col gap-3">
            <h3 className="m-0">3. Customer</h3>
            <p className="muted m-0 text-xs">Phone or email (at least one). Tickets also show in their app when they log in with it.</p>
            <div className="field">
              <label className="label" htmlFor="counter-phone">Mobile number</label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-ink-muted">+91</span>
                <input
                  id="counter-phone"
                  className="input"
                  type="tel"
                  inputMode="numeric"
                  placeholder="98765 43210"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                />
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="counter-email">Email</label>
              <input
                id="counter-email"
                className="input"
                type="email"
                placeholder="name@gmail.com"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="counter-name">Name (optional)</label>
              <input
                id="counter-name"
                className="input"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              />
            </div>
          </div>

          {/* Payment */}
          <div className="card flex flex-col gap-3">
            <h3 className="m-0">4. Payment</h3>
            <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-paper p-1">
              {[
                ["cash", "Cash"],
                ["upi", "UPI"],
                ["split", "Cash + UPI"],
              ].map(([method, label]) => (
                <button
                  key={method}
                  type="button"
                  className={`counter-segment ${payment.method === method ? "active" : ""}`}
                  onClick={() => setPayment({ ...payment, method })}
                >
                  {label}
                </button>
              ))}
            </div>

            {payment.method === "split" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="field">
                  <label className="label" htmlFor="counter-cash">Cash received</label>
                  <input
                    id="counter-cash"
                    className="input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={payment.cashAmount}
                    onChange={(e) => setPayment({ ...payment, cashAmount: e.target.value })}
                  />
                </div>
                <div className="field">
                  <span className="label">Paid by UPI</span>
                  <div className="input flex items-center bg-paper font-bold">{rupees(upiPart)}</div>
                </div>
              </div>
            )}

            {payment.method !== "cash" && (
              <div className="field">
                <label className="label" htmlFor="counter-upi-ref">UPI transaction ID (optional)</label>
                <input
                  id="counter-upi-ref"
                  className="input font-mono"
                  placeholder="e.g. 432198765432"
                  value={payment.upiRef}
                  onChange={(e) => setPayment({ ...payment, upiRef: e.target.value })}
                />
              </div>
            )}

            {error && <p className="error-text m-0">{error}</p>}
            <button className="btn" type="submit" disabled={submitting || lines.length === 0}>
              {submitting ? "Saving sale…" : `Confirm ${rupees(total)} received`}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
