"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { apiFetch } from "@/lib/api";
import { getUser, getUserToken } from "@/lib/auth";
import { clearCart, getCart, setCart, updateQuantity } from "@/lib/cart";

function ShieldIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6l-7-3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [cart, setCartState] = useState([]);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [razorpayReady, setRazorpayReady] = useState(false);

  useEffect(() => {
    const token = getUserToken();
    const currentUser = getUser();
    if (!token || !currentUser) {
      router.replace("/login");
      return;
    }
    setUser(currentUser);
    const currentCart = getCart();
    if (currentCart.length === 0) {
      router.replace("/");
      return;
    }
    setCartState(currentCart);
  }, [router]);

  function changeQty(line, delta) {
    const next = updateQuantity(cart, line.gameKey, line.variantId, line.quantity + delta);
    setCartState(next);
    setCart(next);
    if (next.length === 0) router.replace("/");
  }

  const totalTickets = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart]);
  const total = useMemo(() => cart.reduce((sum, line) => sum + line.quantity * line.pricePerPerson, 0), [cart]);

  async function pay() {
    if (!razorpayReady || !window.Razorpay) {
      setError("Secure payment is still loading. Please try again in a moment.");
      return;
    }
    setError("");
    setPaying(true);
    try {
      const token = getUserToken();
      const order = await apiFetch("/bookings", {
        method: "POST",
        token,
        body: { items: cart.map(({ gameKey, variantId, quantity }) => ({ gameKey, variantId, quantity })) },
      });

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Jalalpur Fun",
        description: `${totalTickets} adventure ticket${totalTickets > 1 ? "s" : ""}`,
        order_id: order.razorpayOrderId,
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        handler: async (response) => {
          try {
            await apiFetch(`/bookings/${order.bookingId}/verify-payment`, {
              method: "POST",
              token,
              body: {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
            });
            clearCart();
            router.push(`/tickets/${order.bookingId}`);
          } catch (paymentError) {
            setError(paymentError.message || "Payment verification failed. Please contact support.");
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
        theme: { color: "#c2410c" },
      });
      razorpay.open();
    } catch (paymentError) {
      setError(paymentError.message || "Could not start payment. Please try again.");
      setPaying(false);
    }
  }

  if (!user || cart.length === 0) return null;

  return (
    <main className="checkout-page">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onReady={() => setRazorpayReady(true)}
        onError={() => setError("Could not load secure payment. Check your connection and try again.")}
      />

      <header className="checkout-header">
        <button onClick={() => router.back()} aria-label="Go back">←</button>
        <div><span>FINAL STEP</span><h1>Review your booking</h1></div>
        <i><ShieldIcon /></i>
      </header>

      <section className="checkout-content">
        <div className="checkout-progress" aria-label="Checkout progress">
          <span className="done"><i>✓</i><small>Choose</small></span><b />
          <span className="active"><i>2</i><small>Review</small></span><b />
          <span><i>3</i><small>Tickets</small></span>
        </div>

        <div className="checkout-title">
          <div><span>YOUR ADVENTURES</span><h2>{totalTickets} ticket{totalTickets > 1 ? "s" : ""} selected</h2></div>
          <button onClick={() => router.push("/")}>+ Add more</button>
        </div>

        <div className="checkout-items">
          {cart.map((line) => (
            <article key={`${line.gameKey}:${line.variantId ?? "flat"}`} className="checkout-item">
              <div className="checkout-item-image">
                {line.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={line.imageUrl} alt="" />
                ) : <span>★</span>}
                <i>{line.quantity}</i>
              </div>

              <div className="checkout-item-main">
                <h3>{line.gameName}</h3>
                <p>{line.variantLabel || "Standard entry"}</p>
                <span>₹{line.pricePerPerson.toFixed(0)} × {line.quantity}</span>
              </div>

              <div className="checkout-item-side">
                <strong>₹{(line.quantity * line.pricePerPerson).toFixed(0)}</strong>
                <div>
                  <button onClick={() => changeQty(line, -1)} aria-label={`Remove one ${line.gameName}`}>−</button>
                  <span>{line.quantity}</span>
                  <button onClick={() => changeQty(line, 1)} aria-label={`Add one ${line.gameName}`}>+</button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <section className="checkout-summary">
          <div className="checkout-summary-heading"><span>ORDER SUMMARY</span><i>{totalTickets} {totalTickets === 1 ? "ticket" : "tickets"}</i></div>
          <div><span>Ticket subtotal</span><strong>₹{total.toFixed(0)}</strong></div>
          <div><span>Booking fee</span><strong className="checkout-free">FREE</strong></div>
          <div className="checkout-summary-total"><span><strong>Total payable</strong><small>Inclusive of all taxes</small></span><b>₹{total.toFixed(0)}</b></div>
        </section>

        <div className="checkout-secure-note"><i><ShieldIcon /></i><span><strong>100% secure payment</strong><small>Payments are encrypted and processed by Razorpay</small></span></div>
        {error && <div className="checkout-error" role="alert"><strong>Payment issue</strong><span>{error}</span></div>}
      </section>

      <footer className="checkout-pay-dock">
        <div><span>TOTAL</span><strong>₹{total.toFixed(0)}</strong></div>
        <button onClick={pay} disabled={paying || !razorpayReady}>
          {paying ? <><i className="login-spinner" /> Processing…</> : !razorpayReady ? <><i className="login-spinner" /> Loading payment…</> : <>Pay securely <span>→</span></>}
        </button>
      </footer>
    </main>
  );
}
