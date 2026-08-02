"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const STATUS_COPY = {
  unused: { label: "READY TO USE", icon: "✓" },
  used: { label: "ALREADY USED", icon: "✓" },
  expired: { label: "EXPIRED", icon: "×" },
};
const SWIPE_THRESHOLD_PX = 50;

export default function QrSwiper({ tickets, visitDate, bookingId }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);

  function clampIndex(index) { return Math.max(0, Math.min(tickets.length - 1, index)); }
  function handlePointerDown(event) { setDragging(true); startXRef.current = event.clientX; event.currentTarget.setPointerCapture?.(event.pointerId); }
  function handlePointerMove(event) { if (dragging) setDragOffset(event.clientX - startXRef.current); }
  function endDrag() {
    if (!dragging) return;
    setDragging(false);
    if (dragOffset <= -SWIPE_THRESHOLD_PX) setActiveIndex((index) => clampIndex(index + 1));
    else if (dragOffset >= SWIPE_THRESHOLD_PX) setActiveIndex((index) => clampIndex(index - 1));
    setDragOffset(0);
  }

  if (tickets.length === 0) return <p className="muted">No tickets to show.</p>;
  const trackStyle = { transform: `translateX(calc(-${activeIndex * 100}% + ${dragOffset}px))`, transition: dragging ? "none" : "transform .32s cubic-bezier(.22,1,.36,1)" };

  return (
    <div className="ticket-swiper">
      <div className="ticket-viewport" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={endDrag} onPointerLeave={endDrag} onPointerCancel={endDrag}>
        <div className="ticket-track" style={trackStyle}>
          {tickets.map((ticket, index) => {
            const state = STATUS_COPY[ticket.status] || STATUS_COPY.unused;
            const disabled = ticket.status !== "unused";
            return (
              <div className="ticket-slide" key={ticket.qrToken}>
                <article className={`digital-ticket ticket-${ticket.status}`}>
                  <div className="digital-ticket-cover" style={ticket.imageUrl ? { backgroundImage: `url(${ticket.imageUrl})` } : undefined}>
                    <div className="digital-ticket-fallback">★</div><div className="digital-ticket-shade" />
                    <span>JALALPUR FUN</span><div><small>ADVENTURE PASS</small><h2>{ticket.gameName}</h2>{ticket.variantLabel && <p>{ticket.variantLabel}</p>}</div>
                  </div>
                  <div className="ticket-cut"><i /><span /><i /></div>
                  <div className="digital-ticket-body">
                    <div className={`ticket-state ${ticket.status}`}><i>{state.icon}</i><span>{state.label}</span></div>
                    <div className={`ticket-qr ${disabled ? "disabled" : ""}`}>
                      <QRCodeSVG value={ticket.qrToken} size={184} bgColor={disabled ? "#f4ece8" : "#ffffff"} fgColor={disabled ? "#a68e84" : "#2b0d06"} level="M" />
                      {disabled && <span>{ticket.status === "used" ? "USED" : "EXPIRED"}</span>}
                    </div>
                    <p className="ticket-code">#{ticket.qrToken.slice(-8).toUpperCase()}</p>
                    <div className="ticket-facts">
                      <span><small>GUEST</small><strong>{ticket.positionLabel}</strong></span>
                      <i />
                      <span><small>VALID ON</small><strong>{visitDate.toLocaleDateString(undefined, { day: "2-digit", month: "short" })}</strong></span>
                      <i />
                      <span><small>PASS</small><strong>{index + 1}/{tickets.length}</strong></span>
                    </div>
                    <p className="ticket-reference">Booking JF-{String(bookingId).padStart(5, "0")} · Present at activity gate</p>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>
      {tickets.length > 1 && <div className="ticket-pagination"><button onClick={() => setActiveIndex((index) => clampIndex(index - 1))} disabled={activeIndex === 0} aria-label="Previous ticket">←</button><div>{tickets.map((ticket, index) => <button key={ticket.qrToken} className={index === activeIndex ? "active" : ""} onClick={() => setActiveIndex(index)} aria-label={`Go to ticket ${index + 1}`} />)}</div><button onClick={() => setActiveIndex((index) => clampIndex(index + 1))} disabled={activeIndex === tickets.length - 1} aria-label="Next ticket">→</button></div>}
      <p className="ticket-position">Ticket {activeIndex + 1} of {tickets.length}</p>
    </div>
  );
}
