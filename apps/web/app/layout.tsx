import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./styles.css";
export const metadata: Metadata = {
  title: "Slotwise",
  description: "Time-zone-safe multi-location booking.",
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
