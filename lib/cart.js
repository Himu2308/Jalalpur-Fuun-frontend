// Cart is an array of line items so the same game can appear more than once with
// different variants (e.g. GoKarting Single·10 min AND GoKarting Double·5 min at once).
// Persisted so it survives the checkout navigation.

function lineId(gameKey, variantId) {
  return `${gameKey}:${variantId ?? "flat"}`;
}

function getCart() {
  const raw = localStorage.getItem("cart");
  return raw ? JSON.parse(raw) : [];
}

function setCart(lines) {
  localStorage.setItem("cart", JSON.stringify(lines));
}

function clearCart() {
  localStorage.removeItem("cart");
}

// line: { gameKey, gameName, imageUrl, variantId, variantLabel, pricePerPerson, quantity }
function addLine(cart, line) {
  const id = lineId(line.gameKey, line.variantId);
  const existing = cart.find((l) => lineId(l.gameKey, l.variantId) === id);
  if (existing) {
    return cart.map((l) =>
      lineId(l.gameKey, l.variantId) === id ? { ...l, quantity: l.quantity + line.quantity } : l
    );
  }
  return [...cart, line];
}

function updateQuantity(cart, gameKey, variantId, quantity) {
  const id = lineId(gameKey, variantId);
  if (quantity <= 0) return cart.filter((l) => lineId(l.gameKey, l.variantId) !== id);
  return cart.map((l) => (lineId(l.gameKey, l.variantId) === id ? { ...l, quantity } : l));
}

export { getCart, setCart, clearCart, addLine, updateQuantity, lineId };
