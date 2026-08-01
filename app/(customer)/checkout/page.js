"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { apiFetch } from "@/lib/api";
import { getUser, getUserToken } from "@/lib/auth";
import { clearCart, getCart, setCart, updateQuantity } from "@/lib/cart";

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

  const total = useMemo(() => cart.reduce((sum, l) => sum + l.quantity * l.pricePerPerson, 0), [cart]);

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
        body: {
          items: cart.map(({ gameKey, variantId, quantity }) => ({ gameKey, variantId, quantity })),
        },
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
          } catch (err) {
            setError(err.message || "Payment verification failed");
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
        theme: { color: "#e2481f" },
      });
      rzp.open();
    } catch (err) {
      setError(err.message || "Could not start payment");
      setPaying(false);
    }
  }

  if (!user || cart.length === 0) return null;

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

      <div className="flex flex-col gap-3">
        {cart.map((line) => (
          <div key={`${line.gameKey}:${line.variantId ?? "flat"}`} className="card flex items-center gap-3">
            {line.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={line.imageUrl}
                alt={line.gameName}
                className="h-14 w-14 shrink-0 rounded-xl object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{line.gameName}</p>
              {line.variantLabel && <p className="muted">{line.variantLabel}</p>}
              <p className="muted">₹{line.pricePerPerson.toFixed(0)} / person</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="qty-control">
                <button className="qty-btn" onClick={() => changeQty(line, -1)}>
                  −
                </button>
                <span className="qty-value">{line.quantity}</span>
                <button className="qty-btn" onClick={() => changeQty(line, 1)}>
                  +
                </button>
              </div>
              <p className="font-semibold text-primary">₹{(line.quantity * line.pricePerPerson).toFixed(0)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card flex items-center justify-between">
        <p className="font-bold">Total</p>
        <p className="text-lg font-bold">₹{total.toFixed(0)}</p>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="sticky-footer">
        <button className="btn" onClick={pay} disabled={paying}>
          {paying ? "Processing..." : `Pay ₹${total.toFixed(0)}`}
        </button>
      </div>
    </div>
  );
}
