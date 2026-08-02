"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { clearUserSession, getUser, getUserToken } from "@/lib/auth";
import { addLine, getCart, setCart, updateQuantity } from "@/lib/cart";
import GameVariantSheet from "@/components/GameVariantSheet";

const CARD_ACCENTS = ["#f97316", "#2563eb", "#059669", "#9333ea"];

function SparkIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" fill="currentColor" />
      <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" fill="currentColor" />
    </svg>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [games, setGames] = useState([]);
  const [cart, setCartState] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sheetGame, setSheetGame] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);

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
    return cart.find((line) => line.gameKey === gameKey && line.variantId == null)?.quantity || 0;
  }

  function updateFlatQty(game, delta) {
    const next = updateQuantity(cart, game.key, null, flatQuantity(game.key) + delta);
    const withLine = delta > 0 && !next.some((line) => line.gameKey === game.key && line.variantId == null)
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
    } catch {
      // The local session should still be cleared if the server is unavailable.
    }
    clearUserSession();
    router.replace("/login");
  }

  const totalItems = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart]);
  const totalAmount = useMemo(() => cart.reduce((sum, line) => sum + line.quantity * line.pricePerPerson, 0), [cart]);

  if (!user) return null;

  const firstName = user.name?.split(" ")[0] || "Explorer";

  return (
    <main className={`home-page ${totalItems ? "home-has-cart" : ""}`}>
      <section className="home-hero">
        <div className="home-orb home-orb-one" />
        <div className="home-orb home-orb-two" />

        <header className="home-header">
          <div className="home-brand">
            <Image
              className="home-brand-logo"
              src="/jalalpur-logo.png"
              alt="Jalalpur Fuun"
              width={700}
              height={354}
              priority
            />
          </div>
          <button
            className="home-avatar"
            onClick={() => setAccountOpen((open) => !open)}
            aria-label="Open account menu"
            aria-expanded={accountOpen}
            aria-haspopup="menu"
          >
            {/* Google profile URLs are remote and not part of the app's configured image hosts. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {user.picture ? <img src={user.picture} alt="" referrerPolicy="no-referrer" /> : <span>{firstName.charAt(0).toUpperCase()}</span>}
            <i />
          </button>
        </header>

        {accountOpen && (
          <>
            <button className="home-account-backdrop" onClick={() => setAccountOpen(false)} aria-label="Close account menu" />
            <div className="home-account-menu" role="menu">
              <div className="home-account-user">
                <span>{firstName.charAt(0).toUpperCase()}</span>
                <div><strong>{user.name || firstName}</strong><small>{user.email || user.phone}</small></div>
              </div>
              <button role="menuitem" onClick={logout}>
                <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M14 8l4 4-4 4M9 12h9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span><strong>Log out</strong><small>Sign out of this account</small></span>
              </button>
            </div>
          </>
        )}

        <div className={`home-welcome ${accountOpen ? "account-is-open" : ""}`}>
          <span className="home-eyebrow"><SparkIcon /> HELLO, {firstName.toUpperCase()}</span>
          <h1>Ready for your<br /><em>next adventure?</em></h1>
          <p>Pick your thrill, grab your tickets and make today unforgettable.</p>
        </div>

        <div className="home-trust-row">
          <span><b>⚡</b><i>Instant<br /><strong>Booking</strong></i></span>
          <span><b>✓</b><i>Safe &amp;<br /><strong>Secure</strong></i></span>
          <span><b>★</b><i>Top-rated<br /><strong>Experiences</strong></i></span>
        </div>
      </section>

      <section className="home-content">
        <div className="home-section-title">
          <div><span>CHOOSE YOUR THRILL</span><h2>Featured activities</h2></div>
          {!loading && <small>{games.length} available</small>}
        </div>

        {error && <div className="home-error" role="alert"><strong>We hit a speed bump</strong><span>{error}</span></div>}

        <div className="home-game-list">
          {loading && [0, 1, 2].map((item) => <div className="home-game-card home-skeleton" key={item}><div /><span /><i /></div>)}

          {games.map((game, index) => {
            const hasVariants = game.variants.length > 0;
            const isGoKarting = /go\s*-?\s*kart/i.test(`${game.key} ${game.name}`);
            const qty = flatQuantity(game.key);
            const price = hasVariants
              ? Math.min(...game.variants.map((variant) => Number(variant.pricePerPerson)))
              : Number(game.price_per_person);

            return (
              <article key={game.key} className="home-game-card" style={{ "--card-accent": CARD_ACCENTS[index % CARD_ACCENTS.length] }}>
                <div className="home-game-image" style={game.image_url ? { backgroundImage: `url(${game.image_url})` } : undefined}>
                  <div className="home-game-fallback"><SparkIcon /></div>
                  <span className="home-game-badge">{index === 0 ? "MOST LOVED" : "ADVENTURE"}</span>
                  <div className="home-game-shade" />
                  <div className="home-game-name"><h3>{game.name}</h3><span>Thrill starts here →</span></div>
                </div>

                <div className="home-game-info">
                  {isGoKarting ? (
                    <div className="home-price home-price-hidden"><small>CHOOSE YOUR RIDE</small><strong>Multiple options</strong></div>
                  ) : (
                    <div className="home-price"><small>{hasVariants ? "STARTING FROM" : "PER PERSON"}</small><strong>₹{price.toFixed(0)}</strong>{hasVariants && <span> / person</span>}</div>
                  )}

                  {hasVariants ? (
                    <button className="home-select-btn" onClick={() => setSheetGame(game)}>View options <span>→</span></button>
                  ) : qty ? (
                    <div className="home-qty">
                      <button onClick={() => updateFlatQty(game, -1)} aria-label={`Remove one ${game.name}`}>−</button>
                      <span><strong>{qty}</strong><small>added</small></span>
                      <button onClick={() => updateFlatQty(game, 1)} aria-label={`Add one ${game.name}`}>+</button>
                    </div>
                  ) : (
                    <button className="home-select-btn" onClick={() => updateFlatQty(game, 1)}>Add ticket <span>+</span></button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {sheetGame && <GameVariantSheet game={sheetGame} onClose={() => setSheetGame(null)} onAdd={handleAddVariantLine} />}

      {totalItems > 0 && (
        <div className="home-cart-dock">
          <button onClick={() => router.push("/checkout")}>
            <span className="home-cart-count">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M5 7h14l-1.4 7.2a2 2 0 0 1-2 1.6H8.4a2 2 0 0 1-2-1.6L5 7Zm0 0-.7-2H2.8M9 20h.01M17 20h.01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <i>{totalItems}</i>
            </span>
            <span className="home-cart-label"><small>YOUR CART</small><strong>{totalItems} ticket{totalItems > 1 ? "s" : ""}</strong></span>
            <span className="home-cart-total"><small>₹{totalAmount.toFixed(0)}</small><strong>Checkout <i>→</i></strong></span>
          </button>
        </div>
      )}
    </main>
  );
}
