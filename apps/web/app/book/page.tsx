import Link from "next/link";
import { BookingFlow } from "./booking-flow";

export default function BookPage() {
  return (
    <main>
      <nav>
        <Link href="/">SLOTWISE</Link>
        <span>
          <Link href="/manage">Manage booking</Link> ·{" "}
          <Link href="/admin">Admin</Link>
        </span>
      </nav>
      <header className="page-header">
        <p className="eyebrow">CUSTOMER BOOKING</p>
        <h1>Find it. Hold it. Book it.</h1>
        <p>
          Search tenant resources, reserve a five-minute checkout window, and
          keep the private access token shown at confirmation.
        </p>
      </header>
      <BookingFlow />
    </main>
  );
}
