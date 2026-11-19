"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getUserToken } from "@/lib/auth";
import QrSwiper from "@/components/QrSwiper";

const TICKET_REFRESH_MS = 2000;

export default function TicketsPage() {
  const router = useRouter();
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback((token, { silent = false } = {}) => {
    return apiFetch("/bookings/mine", { token }).then((data) => {
      const match = data.bookings.find((item) => String(item.id) === String(bookingId));
      if (!match) { setError("This booking could not be found."); return; }
      setError("");
      setBooking(match);
    }).catch((requestError) => {
      // A brief network interruption should not replace tickets already on screen.
      if (!silent) setError(requestError.message || "Could not load tickets");
    });
  }, [bookingId]);

  useEffect(() => {
    const token = getUserToken();
    if (!token) { router.replace("/login"); return undefined; }
    load(token);
    function refreshVisibleTickets() {
      if (document.visibilityState === "visible") load(token, { silent: true });
    }
    function onVisible() { refreshVisibleTickets(); }
    const refreshTimer = window.setInterval(refreshVisibleTickets, TICKET_REFRESH_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(refreshTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, load]);

  if (error) return <main className="tickets-page"><div className="tickets-state"><span>!</span><h1>Ticket unavailable</h1><p>{error}</p><button onClick={() => router.push("/my-bookings")}>Back to my bookings</button></div></main>;
  if (!booking) return <main className="tickets-page"><div className="tickets-loading"><i /><span>Preparing your tickets…</span></div></main>;

  const STATUS_RANK = { unused: 0, expired: 1, used: 2, cancelled: 3 };
  const flatTickets = booking.items.flatMap((item) => item.tickets.map((ticket, index) => ({
    qrToken: ticket.qrToken || ticket.qr_token,
    status: ticket.status || "unused",
    gameName: item.gameName,
    variantLabel: item.variantLabel,
    imageUrl: item.imageUrl,
    positionLabel: `Guest ${index + 1} of ${item.tickets.length}`,
  }))).sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
  const readyCount = flatTickets.filter((ticket) => ticket.status === "unused").length;
  const visitDate = new Date(booking.visit_date);

  return (
    <main className="tickets-page">
      <header className="tickets-header">
        <button onClick={() => router.push("/my-bookings")} aria-label="Back to bookings">←</button>
        <div><span>DIGITAL ENTRY PASS</span><h1>Your tickets</h1></div>
        <i>{flatTickets.length}</i>
      </header>
      <section className="tickets-content">
        <div className="tickets-meta">
          <span><small>VISIT DATE</small><strong>{visitDate.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</strong></span>
          <i />
          <span><small>BOOKING ID</small><strong>JF-{String(booking.id).padStart(5, "0")}</strong></span>
          <i />
          <span><small>READY</small><strong>{readyCount}/{flatTickets.length}</strong></span>
        </div>
        <div className="tickets-instruction"><i>↔</i><span><strong>Swipe between tickets</strong><small>Show one QR code per guest at the activity gate</small></span></div>
        <QrSwiper tickets={flatTickets} visitDate={visitDate} bookingId={booking.id} />
        <div className="tickets-help"><span>ⓘ</span><p><strong>Keep your screen bright</strong><br />Each QR code can be scanned once and will update automatically after entry.</p></div>
      </section>
    </main>
  );
}
