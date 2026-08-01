"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getUserToken } from "@/lib/auth";

export default function MyTicketsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getUserToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    apiFetch("/bookings/mine", { token })
      .then((data) => setBookings(data.bookings))
      .catch((err) => setError(err.message || "Could not load bookings"));
  }, [router]);

  return (
    <div className="page">
      <div className="top-bar">
        <h1>My Bookings</h1>
      </div>
      <Link href="/" className="muted" style={{ textDecoration: "underline" }}>
        ← Back to home
      </Link>

      {error && <p className="error-text">{error}</p>}
      {!bookings && !error && <p className="muted">Loading...</p>}

      {bookings && bookings.length === 0 && <p className="muted">No bookings yet.</p>}

      <div className="game-list">
        {bookings?.map((booking) => {
          const summary = (
            <>
              <p style={{ margin: "0 0 4px", fontWeight: 600 }}>
                {booking.ticketsByGame.map((g) => g.gameName).join(", ") || "Booking"}
              </p>
              <p className="muted" style={{ margin: 0 }}>
                {booking.visit_date} · ₹{Number(booking.total_amount).toFixed(0)} ·{" "}
                <span className={`badge ${booking.status === "paid" ? "unused" : "expired"}`}>
                  {booking.status}
                </span>
              </p>
            </>
          );

          return booking.status === "paid" ? (
            <Link key={booking.id} href={`/tickets/${booking.id}`} className="card" style={{ display: "block" }}>
              {summary}
            </Link>
          ) : (
            <div key={booking.id} className="card" style={{ opacity: 0.6 }}>
              {summary}
            </div>
          );
        })}
      </div>
    </div>
  );
}
