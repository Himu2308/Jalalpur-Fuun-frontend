"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

// tickets: [{ qrToken, gameName, status, positionLabel }]
export default function QrSwiper({ tickets }) {
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(index);
  }

  if (tickets.length === 0) {
    return <p className="muted">No tickets to show.</p>;
  }

  return (
    <div>
      <div className="qr-swiper" ref={containerRef} onScroll={handleScroll}>
        {tickets.map((ticket, i) => (
          <div className="qr-slide" key={ticket.qrToken}>
            <div className="card" style={{ padding: 20 }}>
              <p className="muted" style={{ marginBottom: 8 }}>
                {ticket.gameName} · {ticket.positionLabel}
              </p>
              <QRCodeSVG value={ticket.qrToken} size={220} />
              <p style={{ marginTop: 12 }}>
                <span className={`badge ${ticket.status}`}>{ticket.status}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
      {tickets.length > 1 && (
        <div className="qr-dots">
          {tickets.map((t, i) => (
            <span key={t.qrToken} className={`qr-dot ${i === activeIndex ? "active" : ""}`} />
          ))}
        </div>
      )}
    </div>
  );
}
