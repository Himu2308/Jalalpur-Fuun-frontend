"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getUserToken } from "@/lib/auth";

const STATUS_LABEL = { paid: "Confirmed", pending: "Pending", failed: "Failed" };

function TicketIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5V9a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 15.5V13a2 2 0 0 0 0-4V6.5Z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M10 6v10" stroke="currentColor" strokeWidth="1.8" strokeDasharray="2 2"/></svg>;
}

export default function MyBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getUserToken();
    if (!token) { router.replace("/login"); return; }
    apiFetch("/bookings/mine", { token })
      .then((data) => setBookings(data.bookings))
      .catch((requestError) => setError(requestError.message || "Could not load bookings"));
  }, [router]);

  return (
    <main className="bookings-page">
      <header className="bookings-header">
        <div><span>YOUR ADVENTURES</span><h1>My bookings</h1><p>All your fun, saved in one place.</p></div>
        <i><TicketIcon /></i>
      </header>

      <section className="bookings-content">
        {error && <div className="bookings-error" role="alert"><strong>Couldn&apos;t load bookings</strong><span>{error}</span></div>}

        {!bookings && !error && <div className="bookings-list">{[0, 1].map((item) => <div className="booking-card booking-skeleton" key={item}><div /><span /><i /></div>)}</div>}

        {bookings?.length === 0 && (
          <div className="bookings-empty">
            <i><TicketIcon /></i><span>NO TICKETS YET</span><h2>Your next adventure<br />is waiting</h2><p>Explore activities and book your first unforgettable experience.</p><Link href="/">Explore activities <b>→</b></Link>
          </div>
        )}

        {bookings && bookings.length > 0 && (
          <>
            <div className="bookings-title"><div><span>BOOKING HISTORY</span><h2>{bookings.length} booking{bookings.length > 1 ? "s" : ""}</h2></div><small>Newest first</small></div>
            <div className="bookings-list">
              {bookings.map((booking) => {
                const coverImage = booking.items.find((item) => item.imageUrl)?.imageUrl;
                const ticketCount = booking.items.reduce((sum, item) => sum + item.tickets.length, 0);
                const availableCount = booking.items.reduce((sum, item) => sum + item.tickets.filter((ticket) => ticket.status === "unused").length, 0);
                const CardTag = booking.status === "paid" ? Link : "div";
                const cardProps = booking.status === "paid" ? { href: `/tickets/${booking.id}` } : {};
                const visitDate = new Date(booking.visit_date);

                return (
                  <CardTag key={booking.id} {...cardProps} className={`booking-card status-${booking.status}`}>
                    <div className="booking-cover" style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}>
                      <div className="booking-cover-fallback"><TicketIcon /></div><div className="booking-cover-shade" />
                      <span className={`booking-status ${booking.status}`}><i />{STATUS_LABEL[booking.status] || booking.status}</span>
                      <div className="booking-date"><strong>{visitDate.toLocaleDateString(undefined, { day: "2-digit" })}</strong><span>{visitDate.toLocaleDateString(undefined, { month: "short" }).toUpperCase()}<small>{visitDate.getFullYear()}</small></span></div>
                    </div>
                    <div className="booking-details">
                      <div className="booking-reference"><span>BOOKING #{booking.id}</span><small>{ticketCount} ticket{ticketCount !== 1 ? "s" : ""}</small></div>
                      <div className="booking-activities">
                        {booking.items.map((item) => <div key={item.bookingItemId}><span><strong>{item.gameName}</strong><small>{item.variantLabel || "Standard entry"}</small></span><b>×{item.tickets.length}</b></div>)}
                      </div>
                      <div className="booking-card-footer">
                        <span><small>TOTAL PAID</small><strong>₹{Number(booking.total_amount).toFixed(0)}</strong>{Number(booking.refunded_amount) > 0 && <small className="booking-refunded">₹{Number(booking.refunded_amount).toLocaleString("en-IN")} refunded</small>}</span>
                        {booking.status === "paid" && <b>{availableCount ? `${availableCount} ready to use` : "View tickets"}<i>→</i></b>}
                      </div>
                    </div>
                  </CardTag>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
