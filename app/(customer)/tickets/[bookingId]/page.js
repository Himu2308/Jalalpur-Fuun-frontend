"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getUserToken } from "@/lib/auth";
import QrSwiper from "@/components/QrSwiper";

export default function TicketsPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params.bookingId;
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(
    (token) => {
      apiFetch("/bookings/mine", { token })
        .then((data) => {
          const booking = data.bookings.find((b) => String(b.id) === String(bookingId));
          if (!booking) {
            setError("Booking not found");
            return;
          }
          setItems(booking.items);
        })
        .catch((err) => setError(err.message || "Could not load tickets"));
    },
    [bookingId]
  );

  useEffect(() => {
    const token = getUserToken();
    if (!token) {
      router.replace("/login");
      return undefined;
    }

    load(token);

    // Ticket status changes on the backend the moment a worker scans it —
    // refresh whenever the customer comes back to this tab so it never shows a stale "unused".
    function onVisible() {
      if (document.visibilityState === "visible") load(token);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router, load]);

  if (error) {
    return (
      <div className="page">
        <p className="error-text">{error}</p>
      </div>
    );
  }

  if (!items) {
    return (
      <div className="page">
        <p className="muted">Loading tickets...</p>
      </div>
    );
  }

  const STATUS_RANK = { unused: 0, expired: 1, used: 2 };
  const flatTickets = items
    .flatMap((item) =>
      item.tickets.map((ticket, i) => ({
        qrToken: ticket.qrToken || ticket.qr_token,
        status: ticket.status || "unused",
        gameName: item.gameName,
        variantLabel: item.variantLabel,
        imageUrl: item.imageUrl,
        positionLabel: `Person ${i + 1} of ${item.tickets.length}`,
      }))
    )
    .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);

  return (
    <div className="page">
      <div className="top-bar">
        <h1>Your Tickets</h1>
      </div>
      <p className="muted">Swipe to see each person&apos;s QR code. Valid for entry today only.</p>
      <QrSwiper tickets={flatTickets} />
    </div>
  );
}
