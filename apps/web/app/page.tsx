import Link from "next/link";
export default function Home() {
  return (
    <main>
      <nav>
        <strong>SLOTWISE</strong>
        <span>
          <Link href="/book">Book now</Link> ·{" "}
          <Link href="/admin">Open console</Link>
        </span>
      </nav>
      <section className="hero">
        <p className="eyebrow">BOOKING WITHOUT TIME-ZONE SURPRISES</p>
        <h1>Every location. Every resource. One reliable calendar.</h1>
        <p>
          Manage courts, studios, trainers, and schedules with explicit local
          time and UTC-safe booking records.
        </p>
        <Link className="primary" href="/book">
          Find a resource
        </Link>
      </section>
      <section className="grid">
        <article>
          <b>01</b>
          <h2>Local by design</h2>
          <p>IANA zones and DST rules stay attached to each location.</p>
        </article>
        <article>
          <b>02</b>
          <h2>Atomic by default</h2>
          <p>Holds and booking writes are designed around one winner.</p>
        </article>
        <article>
          <b>03</b>
          <h2>Explainable slots</h2>
          <p>Every suggestion carries its rule and local-time context.</p>
        </article>
      </section>
    </main>
  );
}
