"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { clearUserSession, getUser, getUserToken } from "@/lib/auth";
import { getCart, setCart } from "@/lib/cart";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [games, setGames] = useState([]);
  const [cart, setCartState] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getUserToken();
    const currentUser = getUser();
    if (!token || !currentUser || !currentUser.phone) {
      router.replace("/login");
      return;
    }
    setUser(currentUser);
    setCartState(getCart());

    apiFetch("/games")
      .then((data) => setGames(data.games))
      .catch((err) => setError(err.message || "Could not load activities"))
      .finally(() => setLoading(false));
  }, [router]);

  function updateQty(gameKey, delta) {
    const next = { ...cart };
    const qty = (next[gameKey] || 0) + delta;
    if (qty <= 0) {
      delete next[gameKey];
    } else {
      next[gameKey] = qty;
    }
    setCartState(next);
    setCart(next);
  }

  async function logout() {
    try {
      await apiFetch("/auth/logout", { method: "POST", token: getUserToken() });
    } catch (err) {
      // ignore — clear the local session either way
    }
    clearUserSession();
    router.replace("/login");
  }

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalAmount = games.reduce(
    (sum, g) => sum + (cart[g.key] || 0) * Number(g.price_per_person),
    0
  );

  if (!user) return null;

  return (
    <div className="page">
      <div className="top-bar">
        <h1>Hi, {user.name?.split(" ")[0] || "there"} 👋</h1>
        <button
          className="btn btn-secondary"
          style={{ width: "auto", minHeight: 36, padding: "6px 12px" }}
          onClick={logout}
        >
          Logout
        </button>
      </div>

      <Link href="/my-tickets" className="muted" style={{ textDecoration: "underline" }}>
        My tickets →
      </Link>

      {loading && <p className="muted">Loading activities...</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="game-list">
        {games.map((game) => (
          <div className="card game-card" key={game.key}>
            <div className="info" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {game.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={game.image_url}
                  alt={game.name}
                  style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                />
              )}
              <div>
                <h3>{game.name}</h3>
                <p className="muted">₹{Number(game.price_per_person).toFixed(0)} / person</p>
              </div>
            </div>
            <div className="qty-control">
              <button className="qty-btn" onClick={() => updateQty(game.key, -1)} disabled={!cart[game.key]}>
                −
              </button>
              <span className="qty-value">{cart[game.key] || 0}</span>
              <button className="qty-btn" onClick={() => updateQty(game.key, 1)}>
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {totalItems > 0 && (
        <div className="sticky-footer">
          <button className="btn" onClick={() => router.push("/checkout")}>
            Checkout · {totalItems} ticket{totalItems > 1 ? "s" : ""} · ₹{totalAmount.toFixed(0)}
          </button>
        </div>
      )}
    </div>
  );
}
