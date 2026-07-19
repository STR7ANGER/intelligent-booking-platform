import Link from "next/link";
import { ManageBooking } from "./manage-booking";
export default function ManagePage() {
  return (
    <main>
      <nav>
        <Link href="/">SLOTWISE</Link>
        <Link href="/book">New booking</Link>
      </nav>
      <header className="page-header">
        <p className="eyebrow">PRIVATE BOOKING ACCESS</p>
        <h1>Manage your booking.</h1>
        <p>
          Use the booking ID and one-time access token from your confirmation.
          The token stays in this browser form and is sent only as
          authorization.
        </p>
      </header>
      <ManageBooking />
    </main>
  );
}
