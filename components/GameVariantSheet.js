"use client";

import { useMemo, useState } from "react";

const MODE_LABELS = { single: "Single", double: "Double" };
const MODE_ORDER = ["single", "double"];

export default function GameVariantSheet({ game, onClose, onAdd }) {
  const modes = useMemo(() => {
    const present = new Set(game.variants.map((v) => v.mode));
    const ordered = MODE_ORDER.filter((m) => present.has(m));
    const rest = [...present].filter((m) => !MODE_ORDER.includes(m));
    return [...ordered, ...rest];
  }, [game.variants]);
  const [mode, setMode] = useState(modes[0]);
  const lapsForMode = useMemo(
    () => game.variants.filter((v) => v.mode === mode).sort((a, b) => a.laps - b.laps),
    [game.variants, mode]
  );
  const [variantId, setVariantId] = useState(lapsForMode[0]?.id);
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = game.variants.find((v) => v.id === variantId) || lapsForMode[0];
  const subtotal = (selectedVariant ? Number(selectedVariant.pricePerPerson) : 0) * quantity;

  function selectMode(nextMode) {
    setMode(nextMode);
    const first = game.variants.filter((v) => v.mode === nextMode).sort((a, b) => a.laps - b.laps)[0];
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
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="sheet-backdrop absolute inset-0 bg-black/55" onClick={onClose} />

      <div className="sheet-panel relative z-10 flex max-h-[88dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-3xl bg-surface">
        <div className="relative h-40 shrink-0 bg-navy bg-cover bg-center" style={game.image_url ? { backgroundImage: `url(${game.image_url})` } : undefined}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/0" />
          <div className="absolute top-3 left-1/2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-white/60" />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white"
          >
            ✕
          </button>
          <h2 className="absolute bottom-3 left-4 text-xl font-extrabold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.45)]">
            {game.name}
          </h2>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto p-5">
          {modes.length > 1 && (
            <div className="flex rounded-2xl border border-line bg-paper p-1">
              {modes.map((m) => (
                <button
                  key={m}
                  onClick={() => selectMode(m)}
                  className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                    mode === m ? "bg-primary text-white" : "text-ink-muted"
                  }`}
                >
                  {MODE_LABELS[m] || m}
                </button>
              ))}
            </div>
          )}

          <div>
            <p className="label mb-2">Choose laps</p>
            <div className="grid grid-cols-3 gap-2">
              {lapsForMode.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVariantId(v.id)}
                  className={`flex flex-col items-center gap-0.5 rounded-2xl border py-3 transition-colors ${
                    variantId === v.id
                      ? "border-primary bg-primary/10"
                      : "border-line bg-surface"
                  }`}
                >
                  <span className="text-base font-bold">{v.laps}</span>
                  <span className="text-[0.68rem] text-ink-muted">laps</span>
                  <span className="mt-1 text-sm font-semibold text-primary">
                    ₹{Number(v.pricePerPerson).toFixed(0)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="label mb-0">Number of people</p>
            <div className="qty-control">
              <button className="qty-btn" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                −
              </button>
              <span className="qty-value">{quantity}</span>
              <button className="qty-btn" onClick={() => setQuantity((q) => q + 1)}>
                +
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-line p-4">
          <button className="btn" onClick={handleAdd} disabled={!selectedVariant}>
            Add to cart · ₹{subtotal.toFixed(0)}
          </button>
        </div>
      </div>
    </div>
  );
}
