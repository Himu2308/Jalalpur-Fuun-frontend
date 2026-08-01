"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { clearUserSession, getUser, getUserToken } from "@/lib/auth";
import { addLine, getCart, setCart, updateQuantity } from "@/lib/cart";
import GameVariantSheet from "@/components/GameVariantSheet";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [games, setGames] = useState([]);
  const [cart, setCartState] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sheetGame, setSheetGame] = useState(null);

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

  function flatQuantity(gameKey) {
    return cart.find((l) => l.gameKey === gameKey && l.variantId == null)?.quantity || 0;
  }

  function updateFlatQty(game, delta) {
    const next = updateQuantity(cart, game.key, null, flatQuantity(game.key) + delta);
    const withLine =
      delta > 0 && !next.some((l) => l.gameKey === game.key && l.variantId == null)
        ? addLine(next, {
            gameKey: game.key,
            gameName: game.name,
            imageUrl: game.image_url,
            variantId: null,
            variantLabel: null,
            pricePerPerson: Number(game.price_per_person),
            quantity: delta,
          })
        : next;
    setCartState(withLine);
    setCart(withLine);
  }

  function handleAddVariantLine(line) {
    const next = addLine(cart, line);
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

  const totalItems = useMemo(() => cart.reduce((sum, l) => sum + l.quantity, 0), [cart]);
  const totalAmount = useMemo(
    () => cart.reduce((sum, l) => sum + l.quantity * l.pricePerPerson, 0),
    [cart]
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

      {loading && <p className="muted">Loading activities...</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="flex flex-col gap-4">
        {games.map((game) => {
          const hasVariants = game.variants.length > 0;
          const startingPrice = hasVariants
            ? Math.min(...game.variants.map((v) => Number(v.pricePerPerson)))
            : Number(game.price_per_person);
          const qty = flatQuantity(game.key);

          return (
            <div key={game.key} className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div
                className="relative h-32 bg-navy bg-cover bg-center"
                style={game.image_url ? { backgroundImage: `url(${game.image_url})` } : undefined}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
                <h3 className="absolute bottom-2.5 left-3.5 text-lg font-extrabold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.45)]">
                  {game.name}
                </h3>
              </div>

              <div className="flex items-center justify-between p-3.5">
                <p className="muted">
                  {hasVariants ? "From " : ""}₹{startingPrice.toFixed(0)} / person
                </p>

                {hasVariants ? (
                  <button
                    className="btn"
                    style={{ width: "auto", minHeight: 38, padding: "8px 18px" }}
                    onClick={() => setSheetGame(game)}
                  >
                    Select
                  </button>
                ) : (
                  <div className="qty-control">
                    <button className="qty-btn" onClick={() => updateFlatQty(game, -1)} disabled={!qty}>
                      −
                    </button>
                    <span className="qty-value">{qty}</span>
                    <button className="qty-btn" onClick={() => updateFlatQty(game, 1)}>
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {sheetGame && (
        <GameVariantSheet game={sheetGame} onClose={() => setSheetGame(null)} onAdd={handleAddVariantLine} />
      )}

      {totalItems > 0 && (
        <div className="fixed inset-x-0 bottom-[64px] z-30 flex justify-center px-4">
          <button
            className="flex w-full max-w-[452px] items-center justify-between rounded-2xl bg-primary px-5 py-3.5 font-semibold text-white shadow-[0_8px_24px_rgba(226,72,31,0.35)]"
            onClick={() => router.push("/checkout")}
          >
            <span>
              {totalItems} ticket{totalItems > 1 ? "s" : ""} added
            </span>
            <span>₹{totalAmount.toFixed(0)} · Proceed →</span>
          </button>
        </div>
      )}
    </div>
  );
}
