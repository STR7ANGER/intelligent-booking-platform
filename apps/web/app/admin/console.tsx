"use client";
import { FormEvent, useState } from "react";

const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
export function AdminConsole() {
  const [key, setKey] = useState("");
  const [org, setOrg] = useState("");
  const [items, setItems] = useState<
    Array<{ id: string; name: string; timeZone: string }>
  >([]);
  const [status, setStatus] = useState(
    "Enter the organization ID and admin key.",
  );
  const load = async () => {
    const response = await fetch(`${api}/v1/admin/catalog/${org}`, {
      headers: { "x-admin-key": key },
    });
    if (!response.ok) {
      setStatus(
        response.status === 403
          ? "Admin key rejected."
          : "Catalog unavailable.",
      );
      return;
    }
    const body = (await response.json()) as {
      locations: Array<{ id: string; name: string; timeZone: string }>;
    };
    setItems(body.locations);
    setStatus(body.locations.length ? "" : "No locations yet.");
  };
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch(`${api}/v1/admin/locations`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-key": key },
      body: JSON.stringify({
        organizationId: org,
        name: data.get("name"),
        timeZone: data.get("timeZone"),
        address: data.get("address"),
      }),
    });
    if (!response.ok) {
      setStatus("Check the name, IANA zone, and authorization.");
      return;
    }
    event.currentTarget.reset();
    await load();
  };
  return (
    <section className="admin-grid">
      <form className="panel form" onSubmit={create}>
        <label>
          Organization ID
          <input
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            required
          />
        </label>
        <label>
          Admin key
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
          />
        </label>
        <button type="button" onClick={load}>
          Load catalog
        </button>
        <hr />
        <label>
          Location name
          <input name="name" required />
        </label>
        <label>
          IANA time zone
          <input name="timeZone" defaultValue="Asia/Kolkata" required />
        </label>
        <label>
          Address
          <input name="address" />
        </label>
        <button type="submit">Add location</button>
        <p aria-live="polite">{status}</p>
      </form>
      <section className="list">
        {items.map((item) => (
          <article key={item.id}>
            <b>{item.name}</b>
            <p>{item.timeZone}</p>
          </article>
        ))}
      </section>
    </section>
  );
}
