"use client";

import { useEffect, useMemo, useState } from "react";

const MODE_LABELS = { single: "Single kart", double: "Double kart" };
const MODE_DESCRIPTIONS = { single: "One rider", double: "Two-seat kart" };
const MODE_ORDER = ["single", "double"];

function KartIcon({ double }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <path d="M6 19h20l-2-7H11l-2 4H6v3Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="10" cy="22" r="3" fill="currentColor" /><circle cx="24" cy="22" r="3" fill="currentColor" />
      <path d="M14 12V9h5l2 3M14 15h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {double && <circle cx="16" cy="9" r="2" fill="currentColor" />}
    </svg>
  );
}

export default function GameVariantSheet({ game, onClose, onAdd }) {
  const modes = useMemo(() => {
    const present = new Set(game.variants.map((variant) => variant.mode));
    return [...MODE_ORDER.filter((mode) => present.has(mode)), ...present].filter((mode, index, all) => all.indexOf(mode) === index);
  }, [game.variants]);
  const [mode, setMode] = useState(modes[0]);
  const lapsForMode = useMemo(
    () => game.variants.filter((variant) => variant.mode === mode).sort((a, b) => a.laps - b.laps),
    [game.variants, mode]
  );
  const [variantId, setVariantId] = useState(lapsForMode[0]?.id);
  const [quantity, setQuantity] = useState(1);
  const selectedVariant = game.variants.find((variant) => variant.id === variantId) || lapsForMode[0];
  const subtotal = (selectedVariant ? Number(selectedVariant.pricePerPerson) : 0) * quantity;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  function selectMode(nextMode) {
    setMode(nextMode);
    const first = game.variants.filter((variant) => variant.mode === nextMode).sort((a, b) => a.laps - b.laps)[0];
    setVariantId(first?.id);
  }

  function handleAdd() {
    if (!selectedVariant) return;
    onAdd({
      gameKey: game.key,
      gameName: game.name,
      imageUrl: game.image_url,
      variantId: selectedVariant.id,
      variantLabel: `${MODE_LABELS[selectedVariant.mode] || selectedVariant.mode} · ${selectedVariant.laps} Laps`,
      pricePerPerson: Number(selectedVariant.pricePerPerson),
      quantity,
    });
    onClose();
  }

  return (
    <div className="variant-modal" role="dialog" aria-modal="true" aria-labelledby="variant-title">
      <button className="variant-backdrop" onClick={onClose} aria-label="Close options" />

      <section className="variant-sheet">
        <div className="variant-handle" />
        <header className="variant-header">
          <div>
            <span>BUILD YOUR RIDE</span>
            <h2 id="variant-title">Choose your kart</h2>
            <p>Set your ride type, laps and group size.</p>
          </div>
          <button onClick={onClose} className="variant-close" aria-label="Close">×</button>
        </header>

        <div className="variant-body">
          {modes.length > 0 && (
            <fieldset className="variant-group">
              <legend><b>1</b><span>Ride type</span></legend>
              <div className="variant-mode-grid">
                {modes.map((item) => {
                  const active = mode === item;
                  return (
                    <button key={item} onClick={() => selectMode(item)} className={active ? "active" : ""} aria-pressed={active}>
                      <i><KartIcon double={item === "double"} /></i>
                      <span><strong>{MODE_LABELS[item] || item}</strong><small>{MODE_DESCRIPTIONS[item] || "Kart option"}</small></span>
                      <em>{active ? "✓" : ""}</em>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <fieldset className="variant-group">
            <legend><b>2</b><span>Number of laps</span></legend>
            <div className="variant-lap-grid">
              {lapsForMode.map((variant) => {
                const active = selectedVariant?.id === variant.id;
                return (
                  <button key={variant.id} onClick={() => setVariantId(variant.id)} className={active ? "active" : ""} aria-pressed={active}>
                    <strong>{variant.laps}</strong><small>LAPS</small><span>₹{Number(variant.pricePerPerson).toFixed(0)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="variant-group variant-people">
            <legend><b>3</b><span>Number of people</span></legend>
            <div className="variant-counter">
              <button onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity === 1} aria-label="Remove one person">−</button>
              <span><strong>{quantity}</strong><small>{quantity === 1 ? "PERSON" : "PEOPLE"}</small></span>
              <button onClick={() => setQuantity((value) => value + 1)} aria-label="Add one person">+</button>
            </div>
          </fieldset>
        </div>

        <footer className="variant-footer">
          <div><span>TOTAL</span><strong>₹{subtotal.toFixed(0)}</strong><small>incl. all taxes</small></div>
          <button onClick={handleAdd} disabled={!selectedVariant}>Add to cart <span>→</span></button>
        </footer>
      </section>
    </div>
  );
}
