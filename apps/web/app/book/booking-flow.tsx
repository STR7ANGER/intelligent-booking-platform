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
  const [recommendations, setRecommendations] = useState<
    Array<{ id: string; startsAt: string; reason: string }>
  >([]);
  const track = (event: string, resourceId?: string) => {
    const key = "slotwise_session";
    const sessionId = sessionStorage.getItem(key) ?? crypto.randomUUID();
    sessionStorage.setItem(key, sessionId);
    void fetch(`${api}/v1/analytics/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event,
        sessionId,
        ...(org ? { organizationId: org } : {}),
        ...(resourceId ? { resourceId } : {}),
      }),
      keepalive: true,
    });
  };
  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Searching…");
    track("SEARCH_STARTED");
    const response = await fetch(
      `${api}/v1/customer/search?organizationId=${encodeURIComponent(org)}`,
    );
    if (!response.ok)
      return setStatus("Search is unavailable. Check the organization ID.");
    const data = (await response.json()) as Resource[];
    setResources(data);
    if (!data.length) track("SEARCH_EMPTY");
    setStatus(
      data.length
        ? `${data.length} resources available.`
        : "No active resources found.",
    );
  }
  async function recommend(form: HTMLFormElement) {
    const data = new FormData(form);
    const resourceId = String(data.get("resourceId"));
    const startsAt = new Date(String(data.get("startsAt")));
    const endsAt = new Date(String(data.get("endsAt")));
    if (
      !resourceId ||
      !Number.isFinite(startsAt.valueOf()) ||
      !Number.isFinite(endsAt.valueOf())
    )
      return setStatus(
        "Choose a resource and time before asking for recommendations.",
      );
    const candidates = Array.from({ length: 3 }, (_, index) => ({
      id: `option-${index + 1}`,
      resourceId,
      startsAt: new Date(startsAt.valueOf() + index * 86_400_000).toISOString(),
      endsAt: new Date(endsAt.valueOf() + index * 86_400_000).toISOString(),
    }));
    setStatus("Ranking safe alternatives…");
    const response = await fetch(`${api}/v1/recommendations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        organizationId: org,
        candidates,
        preference: "EARLIEST",
      }),
    });
    if (!response.ok)
      return setStatus("Recommendations are temporarily unavailable.");
    const body = (await response.json()) as {
      candidates: Array<{ id: string; startsAt: string; reason: string }>;
    };
    setRecommendations(body.candidates);
    setStatus("Recommendations ready.");
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
    if (!holdResponse.ok) {
      track("HOLD_FAILED", String(slot.resourceId));
      return setStatus("That time is already held or unavailable.");
    }
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
    track("BOOKING_CONFIRMED", String(slot.resourceId));
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
        <button
          type="button"
          disabled={!resources.length}
          onClick={(event) =>
            recommend(event.currentTarget.form as HTMLFormElement)
          }
        >
          Recommend alternatives
        </button>
        {recommendations.length > 0 && (
          <ol className="recommendations" aria-label="Recommended alternatives">
            {recommendations.map((item) => (
              <li key={item.id}>
                <time dateTime={item.startsAt}>
                  {new Date(item.startsAt).toLocaleString()}
                </time>
                <br />
                <small>{item.reason}</small>
              </li>
            ))}
          </ol>
        )}
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
