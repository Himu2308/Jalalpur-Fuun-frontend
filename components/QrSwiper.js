"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const STAMP = {
  used: { text: "USED", className: "border-success text-success" },
  expired: { text: "EXPIRED", className: "border-danger text-danger" },
};

const SWIPE_THRESHOLD_PX = 50;

// tickets: [{ qrToken, status, gameName, variantLabel, imageUrl, positionLabel }]
export default function QrSwiper({ tickets }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);

  function clampIndex(i) {
    return Math.max(0, Math.min(tickets.length - 1, i));
  }

  function handlePointerDown(e) {
    setDragging(true);
    startXRef.current = e.clientX;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!dragging) return;
    setDragOffset(e.clientX - startXRef.current);
  }

  function endDrag() {
    if (!dragging) return;
    setDragging(false);
    // One swipe moves exactly one card, however far or fast the gesture — no skipping past neighbors.
    if (dragOffset <= -SWIPE_THRESHOLD_PX) {
      setActiveIndex((i) => clampIndex(i + 1));
    } else if (dragOffset >= SWIPE_THRESHOLD_PX) {
      setActiveIndex((i) => clampIndex(i - 1));
    }
    setDragOffset(0);
  }

  if (tickets.length === 0) {
    return <p className="muted">No tickets to show.</p>;
  }

  const trackStyle = {
    transform: `translateX(calc(-${activeIndex * 100}% + ${dragOffset}px))`,
    transition: dragging ? "none" : "transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
  };

  return (
    <div>
      <div
        className="touch-pan-y overflow-hidden py-1 pb-3 select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="flex" style={trackStyle}>
          {tickets.map((ticket) => {
            const stamp = STAMP[ticket.status];
            return (
              <div className="flex flex-none flex-col items-center gap-3 text-center" style={{ width: "100%" }} key={ticket.qrToken}>
                <div className="relative mx-auto w-full max-w-[300px] overflow-hidden rounded-3xl bg-surface shadow-xl">
                  <div
                    className="relative h-32 bg-navy bg-cover bg-center"
                    style={ticket.imageUrl ? { backgroundImage: `url(${ticket.imageUrl})` } : undefined}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                    <div className="absolute inset-x-4 bottom-3 text-left text-white">
                      <p className="text-[0.65rem] font-bold tracking-[0.14em] text-white/75 uppercase">
                        Entry Pass
                      </p>
                      <h3 className="text-lg leading-tight font-extrabold [text-shadow:0_1px_4px_rgba(0,0,0,.5)]">
                        {ticket.gameName}
                      </h3>
                    </div>
                  </div>

                  <div
                    className="h-3 w-full"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle, var(--color-line) 1.6px, transparent 1.6px)",
                      backgroundSize: "10px 10px",
                      backgroundPosition: "center",
                    }}
                  />

                  <div className="relative flex flex-col items-center gap-3 px-6 pt-5 pb-6">
                    {stamp && (
                      <div
                        className={`absolute top-3 right-4 rotate-[-10deg] rounded border-2 px-2 py-0.5 text-xs font-extrabold tracking-wide ${stamp.className}`}
                      >
                        {stamp.text}
                      </div>
                    )}

                    {ticket.variantLabel && (
                      <p className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {ticket.variantLabel}
                      </p>
                    )}

                    <div
                      className={`rounded-2xl border-4 p-2.5 shadow-inner ${
                        ticket.status === "used" ? "border-red-200 bg-red-600" : "border-paper bg-white"
                      }`}
                    >
                      <QRCodeSVG
                        value={ticket.qrToken}
                        size={172}
                        bgColor={ticket.status === "used" ? "#dc2626" : "#ffffff"}
                        fgColor={ticket.status === "used" ? "#ffffff" : "#000000"}
                      />
                    </div>

                    <p className="font-mono text-xs tracking-wider text-ink-muted">
                      #{ticket.qrToken.slice(-8).toUpperCase()}
                    </p>

                    <div className="flex items-center gap-2">
                      <span className="muted">{ticket.positionLabel}</span>
                      <span className={`badge ${ticket.status}`}>{ticket.status}</span>
                    </div>

                    <p className="text-center text-xs text-ink-muted">
                      Valid for entry today only · Present this QR at the gate
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {tickets.length > 1 && (
        <div className="qr-dots">
          {tickets.map((t, i) => (
            <button
              key={t.qrToken}
              aria-label={`Go to ticket ${i + 1}`}
              className={`qr-dot ${i === activeIndex ? "active" : ""}`}
              onClick={() => setActiveIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
