// Cart is a plain object: { [gameKey]: quantity }, persisted so it survives the checkout navigation.

function getCart() {
  const raw = localStorage.getItem('cart');
  return raw ? JSON.parse(raw) : {};
}
function setCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}
function clearCart() {
  localStorage.removeItem('cart');
}

export { getCart, setCart, clearCart };
