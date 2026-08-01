"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getUserToken } from "@/lib/auth";

const STATUS_LABEL = { paid: "Confirmed", pending: "Pending", failed: "Failed" };

export default function MyBookingsPage() {
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

      {error && <p className="error-text">{error}</p>}
      {!bookings && !error && <p className="muted">Loading...</p>}
      {bookings && bookings.length === 0 && (
        <div className="card flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-3xl">🎟️</p>
          <p className="font-semibold">No bookings yet</p>
          <p className="muted">Head to Home and book your first activity.</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {bookings?.map((booking) => {
          const coverImage = booking.items.find((i) => i.imageUrl)?.imageUrl;
          const ticketCount = booking.items.reduce((sum, i) => sum + i.tickets.length, 0);
          const CardTag = booking.status === "paid" ? Link : "div";
          const cardProps = booking.status === "paid" ? { href: `/tickets/${booking.id}` } : {};

          return (
            <CardTag
              key={booking.id}
              {...cardProps}
              className={`block overflow-hidden rounded-2xl border border-line bg-surface ${
                booking.status !== "paid" ? "opacity-70" : ""
              }`}
            >
              <div
                className="relative h-24 bg-navy bg-cover bg-center"
                style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                <div className="absolute inset-x-4 bottom-2.5 flex items-end justify-between text-white">
                  <p className="text-sm font-bold [text-shadow:0_1px_3px_rgba(0,0,0,.5)]">
                    {new Date(booking.visit_date).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      booking.status === "paid"
                        ? "bg-success text-white"
                        : booking.status === "pending"
                          ? "bg-gold text-navy"
                          : "bg-danger text-white"
                    }`}
                  >
                    {STATUS_LABEL[booking.status] || booking.status}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 p-3.5">
                {booking.items.map((item) => (
                  <div key={item.bookingItemId} className="flex items-center justify-between text-sm">
                    <span className="truncate">
                      {item.gameName}
                      {item.variantLabel ? ` · ${item.variantLabel}` : ""}
                    </span>
                    <span className="muted shrink-0">× {item.tickets.length}</span>
                  </div>
                ))}
                <div className="mt-1.5 flex items-center justify-between border-t border-line pt-2">
                  <span className="muted">{ticketCount} ticket{ticketCount !== 1 ? "s" : ""}</span>
                  <span className="font-bold">₹{Number(booking.total_amount).toFixed(0)}</span>
                </div>
              </div>
            </CardTag>
          );
        })}
      </div>
    </div>
  );
}
