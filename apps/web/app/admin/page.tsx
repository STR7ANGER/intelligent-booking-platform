import Link from "next/link";
import { AdminConsole } from "./console";
export default function Admin() {
  return (
    <main>
      <nav>
        <Link href="/">SLOTWISE</Link>
        <span>ADMIN CATALOG</span>
      </nav>
      <header className="page-header">
        <p className="eyebrow">OPERATIONS</p>
        <h1>Shape every bookable calendar.</h1>
        <p>Configure location time zones and the resources they contain.</p>
      </header>
      <AdminConsole />
    </main>
  );
}
