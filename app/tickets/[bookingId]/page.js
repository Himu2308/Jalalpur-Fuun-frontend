"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getUserToken } from "@/lib/auth";
import QrSwiper from "@/components/QrSwiper";

export default function TicketsPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params.bookingId;
  const [ticketsByGame, setTicketsByGame] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getUserToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const cached = sessionStorage.getItem(`booking_${bookingId}`);
    if (cached) {
      setTicketsByGame(JSON.parse(cached));
      return;
    }

    apiFetch("/bookings/mine", { token })
      .then((data) => {
        const booking = data.bookings.find((b) => String(b.id) === String(bookingId));
        if (!booking) {
          setError("Booking not found");
          return;
        }
        setTicketsByGame(booking.ticketsByGame);
      })
      .catch((err) => setError(err.message || "Could not load tickets"));
  }, [bookingId, router]);

  if (error) {
    return (
      <div className="page">
        <p className="error-text">{error}</p>
      </div>
    );
  }

  if (!ticketsByGame) {
    return (
      <div className="page">
        <p className="muted">Loading tickets...</p>
      </div>
    );
  }

  const flatTickets = ticketsByGame.flatMap((group) =>
    group.tickets.map((ticket, i) => ({
      qrToken: ticket.qrToken || ticket.qr_token,
      status: ticket.status || "unused",
      gameName: group.gameName,
      positionLabel: `Person ${i + 1} of ${group.tickets.length}`,
    }))
  );

  return (
    <div className="page">
      <div className="top-bar">
        <h1>Your Tickets</h1>
      </div>
      <p className="muted">Swipe to see each person&apos;s QR code. Valid for entry today only.</p>
      <QrSwiper tickets={flatTickets} />
      <Link href="/" className="btn btn-secondary" style={{ textAlign: "center" }}>
        Back to home
      </Link>
    </div>
  );
}
