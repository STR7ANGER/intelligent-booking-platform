"use client";
import { FormEvent, useState } from "react";

const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
type Booking = {
  id: string;
  resourceId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  refundMinor: number | null;
  currency: string;
};
export function ManageBooking() {
  const [id, setId] = useState("");
  const [token, setToken] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [status, setStatus] = useState("Enter both private credentials.");
  const headers = () => ({
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  });
  async function load(event: FormEvent) {
    event.preventDefault();
    setStatus("Loading…");
    const response = await fetch(
      `${api}/v1/customer/bookings/${encodeURIComponent(id)}`,
      { headers: headers() },
    );
    if (!response.ok) {
      setBooking(null);
      return setStatus(
        response.status === 404
          ? "Booking or access token not recognized."
          : "Unable to load booking.",
      );
    }
    setBooking((await response.json()) as Booking);
    setStatus("");
  }
  async function cancel() {
    if (!confirm("Cancel this booking under the displayed refund policy?"))
      return;
    const response = await fetch(
      `${api}/v1/customer/bookings/${encodeURIComponent(id)}/cancel`,
      { method: "POST", headers: headers(), body: "{}" },
    );
    if (!response.ok) return setStatus("Cancellation could not be completed.");
    const result = (await response.json()) as {
      booking: Booking;
      policy: { refundRate: number };
    };
    setBooking(result.booking);
    setStatus(
      `Cancelled. Refund eligibility: ${result.policy.refundRate * 100}%.`,
    );
  }
  return (
    <section className="booking-grid">
      <form className="panel form" onSubmit={load}>
        <h2>Secure lookup</h2>
        <label>
          Booking ID
          <input
            value={id}
            onChange={(event) => setId(event.target.value)}
            required
          />
        </label>
        <label>
          Access token
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required
            minLength={32}
          />
        </label>
        <button>Load booking</button>
        <p aria-live="polite">{status}</p>
      </form>
      <section className="panel">
        {booking ? (
          <>
            <h2>{booking.status}</h2>
            <p>
              <b>Starts:</b> {new Date(booking.startsAt).toLocaleString()}
            </p>
            <p>
              <b>Ends:</b> {new Date(booking.endsAt).toLocaleString()}
            </p>
            <p>
              <b>Resource:</b> {booking.resourceId}
            </p>
            {booking.status === "CONFIRMED" && (
              <button className="danger" type="button" onClick={cancel}>
                Cancel booking
              </button>
            )}
            {booking.refundMinor !== null && (
              <p>
                Recorded refund: {booking.refundMinor} {booking.currency} minor
                units
              </p>
            )}
          </>
        ) : (
          <>
            <h2>No booking loaded</h2>
            <p>Your private details are never placed in the URL.</p>
          </>
        )}
      </section>
    </section>
  );
}
