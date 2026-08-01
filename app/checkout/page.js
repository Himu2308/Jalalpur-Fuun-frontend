"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { apiFetch } from "@/lib/api";
import { getUser, getUserToken } from "@/lib/auth";
import { clearCart, getCart } from "@/lib/cart";

export default function CheckoutPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [games, setGames] = useState([]);
  const [cart, setCartState] = useState({});
  const [loading, setLoading] = useState(true);
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
    if (Object.keys(currentCart).length === 0) {
      router.replace("/");
      return;
    }
    setCartState(currentCart);

    apiFetch("/games")
      .then((data) => setGames(data.games))
      .catch((err) => setError(err.message || "Could not load activities"))
      .finally(() => setLoading(false));
  }, [router]);

  const lineItems = games
    .filter((g) => cart[g.key])
    .map((g) => ({
      gameKey: g.key,
      name: g.name,
      quantity: cart[g.key],
      subtotal: cart[g.key] * Number(g.price_per_person),
    }));

  const total = lineItems.reduce((sum, item) => sum + item.subtotal, 0);

  async function pay() {
    if (!razorpayReady || !window.Razorpay) {
      setError("Payment gateway is still loading, try again in a moment");
      return;
    }
    setError("");
    setPaying(true);
    try {
      const token = getUserToken();
      const order = await apiFetch("/bookings", {
        method: "POST",
        token,
        body: { items: lineItems.map(({ gameKey, quantity }) => ({ gameKey, quantity })) },
      });

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Jalalpur Fun",
        description: "Activity tickets",
        order_id: order.razorpayOrderId,
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone,
        },
        handler: async (response) => {
          try {
            const result = await apiFetch(`/bookings/${order.bookingId}/verify-payment`, {
              method: "POST",
              token,
              body: {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
            });
            sessionStorage.setItem(
              `booking_${order.bookingId}`,
              JSON.stringify(result.ticketsByGame)
            );
            clearCart();
            router.push(`/tickets/${order.bookingId}`);
          } catch (err) {
            setError(err.message || "Payment verification failed");
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
        theme: { color: "#2563eb" },
      });
      rzp.open();
    } catch (err) {
      setError(err.message || "Could not start payment");
      setPaying(false);
    }
  }

  if (!user) return null;

  return (
    <div className="page">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onReady={() => setRazorpayReady(true)}
      />
      <div className="top-bar">
        <h1>Checkout</h1>
      </div>

      {loading && <p className="muted">Loading...</p>}

      {!loading && (
        <div className="card">
          <table>
            <tbody>
              {lineItems.map((item) => (
                <tr key={item.gameKey}>
                  <td>{item.name}</td>
                  <td>× {item.quantity}</td>
                  <td style={{ textAlign: "right" }}>₹{item.subtotal.toFixed(0)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2}>
                  <strong>Total</strong>
                </td>
                <td style={{ textAlign: "right" }}>
                  <strong>₹{total.toFixed(0)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      <div className="sticky-footer">
        <button className="btn" onClick={pay} disabled={paying || loading}>
          {paying ? "Processing..." : `Pay ₹${total.toFixed(0)}`}
        </button>
      </div>
    </div>
  );
}
