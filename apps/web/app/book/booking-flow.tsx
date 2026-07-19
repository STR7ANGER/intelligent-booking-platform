"use client";
import { FormEvent, useState } from "react";

const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
type Resource = {
  id: string;
  name: string;
  kind: string;
  location: { name: string; timeZone: string };
};
export function BookingFlow() {
  const [org, setOrg] = useState("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [status, setStatus] = useState("Enter an organization to begin.");
  const [confirmation, setConfirmation] = useState<{
    id: string;
    accessToken: string;
  } | null>(null);
  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Searching…");
    const response = await fetch(
      `${api}/v1/customer/search?organizationId=${encodeURIComponent(org)}`,
    );
    if (!response.ok)
      return setStatus("Search is unavailable. Check the organization ID.");
    const data = (await response.json()) as Resource[];
    setResources(data);
    setStatus(
      data.length
        ? `${data.length} resources available.`
        : "No active resources found.",
    );
  }
  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const slot = {
      organizationId: org,
      resourceId: data.get("resourceId"),
      startsAt: new Date(String(data.get("startsAt"))).toISOString(),
      endsAt: new Date(String(data.get("endsAt"))).toISOString(),
    };
    setStatus("Holding your slot…");
    const holdResponse = await fetch(`${api}/v1/bookings/holds`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(slot),
    });
    if (!holdResponse.ok)
      return setStatus("That time is already held or unavailable.");
    const hold = (await holdResponse.json()) as { holdToken: string };
    const bookingResponse = await fetch(`${api}/v1/bookings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        ...slot,
        ...hold,
        customerName: data.get("name"),
        customerEmail: data.get("email"),
      }),
    });
    if (!bookingResponse.ok)
      return setStatus("Checkout failed. Your card was not charged.");
    const result = (await bookingResponse.json()) as {
      booking: { id: string };
      accessToken: string;
    };
    setConfirmation({ id: result.booking.id, accessToken: result.accessToken });
    setStatus("Booking confirmed.");
  }
  return (
    <section className="booking-grid">
      <form className="panel form" onSubmit={search}>
        <h2>1. Search</h2>
        <label>
          Organization ID
          <input
            value={org}
            onChange={(event) => setOrg(event.target.value)}
            required
          />
        </label>
        <button>Find resources</button>
        <p aria-live="polite">{status}</p>
      </form>
      <form className="panel form" onSubmit={checkout}>
        <h2>2. Checkout</h2>
        <label>
          Resource
          <select name="resourceId" required>
            <option value="">Select one</option>
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.name} · {resource.location.name} (
                {resource.location.timeZone})
              </option>
            ))}
          </select>
        </label>
        <label>
          Starts
          <input name="startsAt" type="datetime-local" required />
        </label>
        <label>
          Ends
          <input name="endsAt" type="datetime-local" required />
        </label>
        <label>
          Name
          <input name="name" autoComplete="name" required />
        </label>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <button disabled={!resources.length}>Hold and confirm</button>
      </form>
      <section className="panel">
        <h2>3. Confirmation</h2>
        {confirmation ? (
          <>
            <p>
              <b>Booking:</b> {confirmation.id}
            </p>
            <p className="token">
              <b>Private access token:</b> {confirmation.accessToken}
            </p>
            <p>
              Save this token. It is shown only once and is required to manage
              the booking.
            </p>
          </>
        ) : (
          <p>Your confirmation will appear here.</p>
        )}
      </section>
    </section>
  );
}
